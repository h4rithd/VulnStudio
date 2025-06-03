
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileArchive } from 'lucide-react';
import { exportProjectToZip } from '@/utils/projectExport';
import { getTempProject, getTempVulnerabilities } from '@/utils/tempProjectUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProjectExportDialogProps {
  projectId: string;
  projectTitle: string;
  children: React.ReactNode;
}

const ProjectExportDialog = ({ projectId, projectTitle, children }: ProjectExportDialogProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handlePdfExport = async () => {
    try {
      setIsExporting(true);
      
      let requestBody = {};
      
      // Handle temporary projects by sending project data in request body
      if (projectId.startsWith('temp_')) {
        const project = getTempProject(projectId);
        const vulnerabilities = getTempVulnerabilities(projectId);
        
        if (!project) {
          throw new Error('Temporary project not found');
        }
        
        requestBody = {
          tempProjectData: {
            project,
            vulnerabilities
          }
        };
      }

      const response = await fetch(`/api/reports/${projectId}/download-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'PDF export failed');
      }

      // Create download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectTitle.replace(/\s+/g, '_')}_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'PDF Export Successful',
        description: 'Professional PDF report has been downloaded successfully'
      });

      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('PDF export error:', error);
      toast({
        title: 'PDF Export Failed',
        description: error.message || 'Failed to generate PDF report',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleZipExport = async () => {
    try {
      setIsExporting(true);
      
      // Handle temporary projects by using client-side export
      if (projectId.startsWith('temp_')) {
        const zipBlob = await exportProjectToZip(projectId);
        
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${projectTitle.replace(/\s+/g, '_')}_export.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Handle cloud projects by calling backend
        const response = await fetch(`/api/reports/${projectId}/export`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Export failed');
        }

        // Create download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${projectTitle.replace(/\s+/g, '_')}_export.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast({
        title: 'Export Successful',
        description: 'Project has been exported successfully'
      });

      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export project',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
          <DialogDescription>
            Choose your export format for "{projectTitle}".
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col space-y-2">
          <Button
            type="button"
            onClick={handlePdfExport}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <FileArchive className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileArchive className="mr-2 h-4 w-4" />
                Export as Professional PDF
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleZipExport}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <FileArchive className="mr-2 h-4 w-4 animate-spin" />
                Exporting ZIP...
              </>
            ) : (
              <>
                <FileArchive className="mr-2 h-4 w-4" />
                Export as ZIP Archive
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsDialogOpen(false)}
            disabled={isExporting}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectExportDialog;
