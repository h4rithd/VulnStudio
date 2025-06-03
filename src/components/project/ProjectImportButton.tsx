
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { reportsApi } from '@/utils/api';
import { FileUp } from 'lucide-react';
import { ProjectTypeDialog } from './ProjectTypeDialog';
import { generateTempId, saveTempProject, saveTempVulnerabilities } from '@/utils/tempProjectUtils';
import JSZip from 'jszip';

const ProjectImportButton = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const extractJSONFromZip = async (file: File): Promise<any> => {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    
    let projectData = null;
    let vulnerabilitiesData = [];
    let metadataData = {};
    
    // Look for project.json, vulnerabilities.json, and metadata.json
    const fileNames = Object.keys(zipContent.files);
    
    for (const filename of fileNames) {
      if (filename.endsWith('.json')) {
        const content = await zipContent.files[filename].async('text');
        try {
          const data = JSON.parse(content);
          
          if (filename.includes('project') || (data.title && (data.start_date || data.end_date))) {
            projectData = data;
          } else if (filename.includes('vulnerabilities') || Array.isArray(data)) {
            vulnerabilitiesData = Array.isArray(data) ? data : [data];
          } else if (filename.includes('metadata')) {
            metadataData = data;
          } else if (data.project && data.vulnerabilities) {
            // Combined export format
            projectData = data.project;
            vulnerabilitiesData = data.vulnerabilities || [];
            metadataData = data.metadata || {};
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    if (!projectData) {
      throw new Error('No valid project data found in ZIP file');
    }
    
    return {
      project: projectData,
      vulnerabilities: vulnerabilitiesData,
      metadata: metadataData
    };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isZip = file.name.endsWith('.zip');
    const isJson = file.name.endsWith('.json');

    if (!isZip && !isJson) {
      toast({
        title: 'Invalid File',
        description: 'Please select a ZIP or JSON file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsImporting(true);
      
      let fileData: any;
      
      if (isZip) {
        fileData = await extractJSONFromZip(file);
      } else {
        const fileContent = await file.text();
        const data = JSON.parse(fileContent);
        
        // Handle different JSON formats
        if (data.project && data.vulnerabilities) {
          fileData = data;
        } else if (data.title || data.start_date) {
          // Single project format
          fileData = { project: data, vulnerabilities: [], metadata: {} };
        } else {
          fileData = data;
        }
      }
      
      setImportData(fileData);
      setShowTypeDialog(true);
    } catch (error: any) {
      console.error('File processing error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to process the selected file',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportConfirm = async (isTemporary: boolean) => {
    if (!importData) return;

    try {
      setIsImporting(true);

      if (isTemporary) {
        // Handle temporary project import
        const project = importData.project || importData;
        const vulnerabilities = importData.vulnerabilities || [];

        // Generate new temporary ID
        const newProjectId = generateTempId('temp');
        
        // Create temporary project
        const tempProject = {
          ...project,
          id: newProjectId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          isTemporary: true
        };

        // Save project to localStorage
        saveTempProject(tempProject);

        // Process and save vulnerabilities with consistent key
        if (vulnerabilities.length > 0) {
          const tempVulnerabilities = vulnerabilities.map((vuln: any, index: number) => ({
            ...vuln,
            id: generateTempId('temp_vuln'),
            report_id: newProjectId,
            display_order: vuln.display_order || index + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          saveTempVulnerabilities(newProjectId, tempVulnerabilities);
        }

        toast({
          title: 'Import Successful',
          description: 'Temporary project has been imported to browser storage',
        });
      } else {
        // Handle cloud project import - send properly structured data
        const cloudImportData = {
          project: importData.project || importData,
          vulnerabilities: importData.vulnerabilities || [],
          metadata: importData.metadata || {
            exportedAt: new Date().toISOString(),
            version: '1.0'
          }
        };

        console.log('Sending cloud import data:', cloudImportData);

        // Fix: Send the object directly, not as a string
        const result = await reportsApi.importDatabase(cloudImportData);

        if (!result.success) {
          throw new Error(result.error || 'Cloud import failed');
        }

        toast({
          title: 'Import Successful',
          description: 'Cloud project has been imported successfully',
        });
      }

      // Refresh the page to show the imported project
      window.location.reload();
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import project',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      setImportData(null);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zip"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={isImporting}
      />
      
      <Button 
        variant="outline" 
        onClick={handleButtonClick}
        disabled={isImporting}
      >
        <FileUp className="mr-2 h-4 w-4" />
        {isImporting ? 'Processing...' : 'Import Project'}
      </Button>

      <ProjectTypeDialog
        isOpen={showTypeDialog}
        onClose={() => {
          setShowTypeDialog(false);
          setImportData(null);
        }}
        onConfirm={handleImportConfirm}
        projectTitle={importData?.project?.title || importData?.title}
      />
    </>
  );
};

export default ProjectImportButton;
