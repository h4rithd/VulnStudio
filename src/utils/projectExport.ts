
import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';

// Function to export a project to JSON and images as a ZIP file
export async function exportProjectToZip(projectId: string): Promise<Blob> {
  try {
    // Check if this is a temporary project
    if (projectId.startsWith('temp_')) {
      return exportTemporaryProjectToZip(projectId);
    }
    
    // Fetch the project data
    const { data: project, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (error) throw error;
    if (!project) throw new Error('Project not found');
    
    // Fetch vulnerabilities for this project
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .eq('report_id', projectId);
      
    if (vulnError) throw vulnError;
    
    // Create a new zip file
    const zip = new JSZip();
    
    // Convert project and vulnerabilities to a clean format for export
    // Remove internal IDs and other non-essential fields
    const projectForExport = {
      title: project.title,
      start_date: project.start_date,
      end_date: project.end_date,
      preparer: project.preparer,
      preparer_email: project.preparer_email,
      reviewer: project.reviewer,
      reviewer_email: project.reviewer_email,
      version: project.version,
      version_history: project.version_history,
      scope: project.scope,
      status: project.status,
      vulnerabilities: vulnerabilities || []
    };
    
    // Add project data as JSON
    zip.file("project.json", JSON.stringify(projectForExport, null, 2));
    
    // Create a README file
    const readmeContent = `# Security Project Export
Project: ${project.title}
Exported on: ${new Date().toLocaleDateString()}

This zip file contains a complete export of your security project, including:
- Project details
- Vulnerabilities
- Images (encoded in base64 within the project.json file)

To import this project back into the application, use the "Import Project" button.
`;
    
    zip.file("README.txt", readmeContent);
    
    // Generate the zip file
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 9
      }
    });
    
    return zipBlob;
  } catch (error) {
    console.error('Error exporting project:', error);
    throw error;
  }
}

// Function to export a temporary project to a ZIP file
export function exportTemporaryProjectToZip(projectId: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Get the project from localStorage
      const tempProjectsJSON = localStorage.getItem('tempProjects');
      const tempProjects = tempProjectsJSON ? JSON.parse(tempProjectsJSON) : [];
      const project = tempProjects.find((p: any) => p.id === projectId);
      
      if (!project) {
        throw new Error('Temporary project not found');
      }
      
      // Get vulnerabilities for this project from localStorage
      const vulnKey = `tempVulnerabilities_${projectId}`;
      const vulnJSON = localStorage.getItem(vulnKey);
      const vulnerabilities = vulnJSON ? JSON.parse(vulnJSON) : [];
      
      // Create a new zip file
      const zip = new JSZip();
      
      // Add project data with vulnerabilities as JSON
      const projectForExport = {
        ...project,
        vulnerabilities
      };
      
      zip.file("project.json", JSON.stringify(projectForExport, null, 2));
      
      // Create a README file
      const readmeContent = `# Security Project Export (Temporary)
Project: ${project.title}
Exported on: ${new Date().toLocaleDateString()}

This zip file contains a complete export of your temporary security project.
To import this project back into the application, use the "Import Project" button.
`;
      
      zip.file("README.txt", readmeContent);
      
      // Generate the zip file
      zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 9
        }
      }).then(blob => {
        resolve(blob);
      });
      
    } catch (error) {
      console.error('Error exporting temporary project:', error);
      reject(error);
    }
  });
}
