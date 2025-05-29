
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import html2pdf from 'html2pdf.js';
import { Reports, Vulnerabilities } from '@/types/database.types';
import { reportsApi, vulnerabilitiesApi } from '@/utils/api';

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'json' | 'zip';
  includeImages?: boolean;
  includeMetadata?: boolean;
}

export const exportProjectData = async (
  project: Reports,
  vulnerabilities: Vulnerabilities[],
  options: ExportOptions
): Promise<void> => {
  try {
    switch (options.format) {
      case 'json':
        await exportAsJSON(project, vulnerabilities);
        break;
      case 'pdf':
        await exportAsPDF(project, vulnerabilities);
        break;
      case 'zip':
        await exportAsZIP(project, vulnerabilities, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};

export const exportProjectToZip = async (projectId: string): Promise<Blob> => {
  try {
    // Fetch project data
    const projectResult = await reportsApi.getById(projectId);
    if (!projectResult.success || !projectResult.data) {
      throw new Error(projectResult.error || 'Failed to fetch project data');
    }

    // Fetch vulnerabilities
    const vulnerabilitiesResult = await vulnerabilitiesApi.getByReportId(projectId);
    if (!vulnerabilitiesResult.success) {
      throw new Error(vulnerabilitiesResult.error || 'Failed to fetch vulnerabilities');
    }

    const zip = new JSZip();
    
    // Add project data
    zip.file('project.json', JSON.stringify(projectResult.data, null, 2));
    zip.file('vulnerabilities.json', JSON.stringify(vulnerabilitiesResult.data || [], null, 2));
    
    // Add HTML report
    const htmlContent = generateHTMLReport(projectResult.data, vulnerabilitiesResult.data || []);
    zip.file('report.html', htmlContent);
    
    // Add metadata
    const metadata = {
      exportDate: new Date().toISOString(),
      exportedBy: 'Security Assessment Tool',
      version: '1.0',
      projectId: projectResult.data.id,
      vulnerabilityCount: (vulnerabilitiesResult.data || []).length
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));
    
    // Generate and return ZIP blob
    return await zip.generateAsync({ type: 'blob' });
  } catch (error) {
    console.error('ZIP export failed:', error);
    throw error;
  }
};

const exportAsJSON = async (project: Reports, vulnerabilities: Vulnerabilities[]): Promise<void> => {
  const exportData = {
    project,
    vulnerabilities,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  saveAs(blob, `${project.title}-export.json`);
};

const exportAsPDF = async (project: Reports, vulnerabilities: Vulnerabilities[]): Promise<void> => {
  // Create HTML content for PDF
  const htmlContent = generateHTMLReport(project, vulnerabilities);
  
  const options = {
    margin: 1,
    filename: `${project.title}-report.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  
  await html2pdf().set(options).from(htmlContent).save();
};

const exportAsZIP = async (
  project: Reports, 
  vulnerabilities: Vulnerabilities[], 
  options: ExportOptions
): Promise<void> => {
  const zip = new JSZip();
  
  // Add project data
  zip.file('project.json', JSON.stringify(project, null, 2));
  zip.file('vulnerabilities.json', JSON.stringify(vulnerabilities, null, 2));
  
  // Add HTML report
  const htmlContent = generateHTMLReport(project, vulnerabilities);
  zip.file('report.html', htmlContent);
  
  // Add metadata if requested
  if (options.includeMetadata) {
    const metadata = {
      exportDate: new Date().toISOString(),
      exportedBy: 'Security Assessment Tool',
      version: '1.0',
      projectId: project.id,
      vulnerabilityCount: vulnerabilities.length
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));
  }
  
  // Generate and save ZIP
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${project.title}-export.zip`);
};

const generateHTMLReport = (project: Reports, vulnerabilities: Vulnerabilities[]): string => {
  const sortedVulnerabilities = [...vulnerabilities].sort((a, b) => {
    const severityOrder: Record<string, number> = {
      'critical': 1,
      'high': 2,
      'medium': 3,
      'low': 4,
      'info': 5
    };
    
    return (severityOrder[a.severity.toLowerCase()] || 0) - (severityOrder[b.severity.toLowerCase()] || 0);
  });
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${project.title} - Security Assessment Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .project-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 40px;
        }
        .vulnerability {
          border: 1px solid #ddd;
          margin-bottom: 30px;
          padding: 20px;
          border-radius: 5px;
        }
        .severity {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 3px;
          color: white;
          font-weight: bold;
          text-transform: uppercase;
        }
        .severity.critical { background-color: #dc3545; }
        .severity.high { background-color: #fd7e14; }
        .severity.medium { background-color: #ffc107; color: #333; }
        .severity.low { background-color: #28a745; }
        .severity.info { background-color: #17a2b8; }
        .section {
          margin-bottom: 20px;
        }
        .section h4 {
          margin-bottom: 10px;
          color: #555;
        }
        pre {
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 3px;
          overflow-x: auto;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${project.title}</h1>
        <h2>Security Assessment Report</h2>
      </div>
      
      <div class="project-info">
        <div>
          <p><strong>Start Date:</strong> ${project.start_date}</p>
          <p><strong>End Date:</strong> ${project.end_date}</p>
          <p><strong>Preparer:</strong> ${project.preparer}</p>
        </div>
        <div>
          <p><strong>Reviewer:</strong> ${project.reviewer}</p>
          <p><strong>Version:</strong> ${project.version}</p>
          <p><strong>Status:</strong> ${project.status}</p>
        </div>
      </div>
      
      <h2>Vulnerabilities</h2>
      ${sortedVulnerabilities.map((vuln, index) => `
        <div class="vulnerability">
          <h3>${index + 1}. ${vuln.title}</h3>
          <span class="severity ${vuln.severity.toLowerCase()}">${vuln.severity} (${vuln.cvss_score})</span>
          
          <div class="section">
            <h4>Background</h4>
            <p>${vuln.background}</p>
          </div>
          
          <div class="section">
            <h4>Details</h4>
            <p>${vuln.details}</p>
          </div>
          
          <div class="section">
            <h4>Remediation</h4>
            <p>${vuln.remediation}</p>
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;
};

export default { exportProjectData, exportProjectToZip };
