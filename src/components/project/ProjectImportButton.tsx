import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Import } from 'lucide-react';
import JSZip from 'jszip';
import { reportsApi, vulnerabilitiesApi } from '@/utils/api';

const ProjectImportButton = () => {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      return;
    }
    
    setIsImporting(true);
    
    try {
      // Read the zip file
      const zipData = await file.arrayBuffer();
      const zip = new JSZip();
      
      // Load the zip file
      const contents = await zip.loadAsync(zipData);
      
      // Extract project JSON
      const projectJsonFile = contents.file('project.json');
      if (!projectJsonFile) {
        throw new Error('Invalid project file: project.json not found');
      }
      
      const projectJson = JSON.parse(await projectJsonFile.async('text'));
      
      // Validate project JSON
      if (!projectJson.title || !projectJson.scope) {
        throw new Error('Invalid project file: missing required fields');
      }
      
      // Process images if they exist
      let processedVulnerabilities = projectJson.vulnerabilities || [];
      
      if (processedVulnerabilities.length > 0) {
        // Process each vulnerability to handle base64 images
        processedVulnerabilities = await Promise.all(
          processedVulnerabilities.map(async (vuln: any) => {
            // Process POC images
            if (vuln.poc_images && vuln.poc_images.length > 0) {
              // Since images are already in base64 format in the export, we can use them directly
              return vuln;
            }
            
            // Process retest images if they exist
            if (vuln.retest_images && vuln.retest_images.length > 0) {
              // Same as above, retest images are already base64 encoded
              return vuln;
            }
            
            return vuln;
          })
        );
      }
      
      // Create new project in database using the API
      const result = await reportsApi.create({
        title: projectJson.title,
        start_date: projectJson.start_date,
        end_date: projectJson.end_date,
        preparer: projectJson.preparer,
        preparer_email: projectJson.preparer_email || '',
        reviewer: projectJson.reviewer,
        reviewer_email: projectJson.reviewer_email || '',
        version: projectJson.version || '1.0',
        version_history: projectJson.version_history || '',
        scope: projectJson.scope || [],
        status: projectJson.status || 'draft',
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create project');
      }
      
      const project = result.data;
      
      // If we have vulnerabilities, import them
      if (processedVulnerabilities.length > 0 && project) {
        // Add each vulnerability one by one
        for (const vuln of processedVulnerabilities) {
          // Remove id and report_id from the vulnerability
          const { id, report_id, ...vulnData } = vuln;
          
          // Create the vulnerability using the API
          const vulnResult = await vulnerabilitiesApi.create({
            ...vulnData,
            report_id: project.id
          });
          
          if (!vulnResult.success) {
            console.error('Failed to import vulnerability:', vulnResult.error);
            // Continue with other vulnerabilities even if one fails
          }
        }
      }
      
      toast({
        title: 'Success',
        description: 'Project imported successfully',
      });
      
      // Navigate to the new project
      navigate(`/projects/${project.id}`);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import project',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      // Reset the file input
      event.target.value = '';
    }
  };
  
  return (
    <>
      <Button
        variant="outline"
        onClick={() => document.getElementById('project-import-input')?.click()}
        disabled={isImporting}
        className="flex gap-2 items-center"
      >
        <Import className="h-4 w-4" />
        {isImporting ? 'Importing...' : 'Import Project'}
      </Button>
      <input
        id="project-import-input"
        type="file"
        accept=".zip"
        onChange={handleImport}
        className="hidden"
      />
    </>
  );
};

export default ProjectImportButton;