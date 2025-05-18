
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Import } from 'lucide-react';
import JSZip from 'jszip';

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
      
      // Create new project in database
      const { data: project, error } = await supabase
        .from('reports')
        .insert({
          title: projectJson.title,
          start_date: projectJson.start_date,
          end_date: projectJson.end_date,
          preparer: projectJson.preparer,
          reviewer: projectJson.reviewer,
          version: projectJson.version,
          version_history: projectJson.version_history || '',
          scope: projectJson.scope,
          status: projectJson.status || 'draft',
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // If we have vulnerabilities, import them
      if (processedVulnerabilities.length > 0) {
        // Map vulnerabilities to the new project
        const vulnerabilitiesToInsert = processedVulnerabilities.map((vuln: any) => {
          // Strip old IDs and use the new project ID
          const { id, ...vulnWithoutId } = vuln;
          return {
            ...vulnWithoutId,
            report_id: project.id,
            created_by: user.id
          };
        });
        
        // Insert all vulnerabilities
        const { error: vulnError } = await supabase
          .from('vulnerabilities')
          .insert(vulnerabilitiesToInsert);
        
        if (vulnError) {
          throw vulnError;
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
