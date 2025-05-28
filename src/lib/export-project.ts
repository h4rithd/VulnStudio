
import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';

// Function to export a project to JSON and images as a ZIP file
export async function exportProjectToZip(project: any): Promise<void> {
  try {
    // Check if this is a temporary project
    if (project.id.startsWith('temp_')) {
      return exportTemporaryProjectToZip(project);
    }
    
    // Fetch the project data
    const { data: projectData, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', project.id)
      .single();
    
    if (error) throw error;
    if (!projectData) throw new Error('Project not found');
    
    // Fetch vulnerabilities for this project
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .eq('report_id', project.id);
      
    if (vulnError) throw vulnError;
    
    // Create a new zip file
    const zip = new JSZip();
    
    // Convert project and vulnerabilities to a clean format for export
    const projectForExport = {
      title: projectData.title,
      start_date: projectData.start_date,
      end_date: projectData.end_date,
      preparer: projectData.preparer,
      preparer_email: projectData.preparer_email,
      reviewer: projectData.reviewer,
      reviewer_email: projectData.reviewer_email,
      version: projectData.version,
      version_history: projectData.version_history,
      scope: projectData.scope,
      status: projectData.status,
      vulnerabilities: vulnerabilities || []
    };
    
    // Add project data as JSON
    zip.file("project.json", JSON.stringify(projectForExport, null, 2));
    
    // Create a README file
    const readmeContent = `# Security Project Export
Project: ${projectData.title}
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
    
    // Download the file
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error exporting project:', error);
    throw error;
  }
}

// Function to export a temporary project to a ZIP file
function exportTemporaryProjectToZip(project: any): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Get vulnerabilities for this project from localStorage
      const vulnKey = `tempVulnerabilities_${project.id}`;
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
        // Download the file
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        resolve();
      });
      
    } catch (error) {
      console.error('Error exporting temporary project:', error);
      reject(error);
    }
  });
}
