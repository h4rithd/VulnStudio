import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Reports, Vulnerabilities } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, FileDown, FileJson } from 'lucide-react';
import { DownloadDropdown } from '@/components/report/DownloadDropdown';
import html2pdf from 'html2pdf.js';
import { htmlToWord } from '@/lib/htmlToWord';
import { Button } from '@/components/ui/button';
import { exportProjectToZip, exportProfessionalPdf } from '@/utils/projectExport';
import { ReportPreview } from '@/components/report/ReportPreview';
import { reportsApi, vulnerabilitiesApi } from '@/utils/api';
import { isTemporaryProject, getTempProject, getTempVulnerabilities } from '@/utils/tempProjectUtils';

const ReportView = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [project, setProject] = useState<Reports | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isProfessionalPdfLoading, setIsProfessionalPdfLoading] = useState(false);
  const [projectData, setProjectData] = useState<any>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;

      try {
        setIsLoading(true);
        
        // Handle temporary projects
        if (isTemporaryProject(projectId)) {
          // Load project data from localStorage
          const tempProject = getTempProject(projectId);
          if (!tempProject) {
            throw new Error('Temporary project not found');
          }
          
          setProjectData(tempProject);
          setProject(tempProject);
          
          // Load vulnerabilities from localStorage
          const tempVulns = getTempVulnerabilities(projectId);
          setVulnerabilities(tempVulns);
          
          // Check if we need to auto-download
          const downloadFormat = searchParams.get('download');
          if (downloadFormat) {
            setTimeout(() => {
              handleDownload(downloadFormat as 'html' | 'markdown' | 'pdf' | 'word' | 'zip' | 'json');
            }, 1000);
          }
          
          setIsLoading(false);
          return;
        }
        
        // Handle regular projects - fetch from API
        const projectResult = await reportsApi.getById(projectId);
        if (!projectResult.success) {
          throw new Error(projectResult.error || 'Failed to load project data');
        }
        setProjectData(projectResult.data);
        setProject(projectResult.data);
        
        // Fetch vulnerabilities from API
        const vulnResult = await vulnerabilitiesApi.getByReportId(projectId);
        if (!vulnResult.success) {
          throw new Error(vulnResult.error || 'Failed to load vulnerabilities');
        }
        setVulnerabilities(vulnResult.data || []);
        
        // Check if we need to auto-download
        const downloadFormat = searchParams.get('download');
        if (downloadFormat) {
          setTimeout(() => {
            handleDownload(downloadFormat as 'html' | 'markdown' | 'pdf' | 'word' | 'zip' | 'json');
          }, 1000);
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load project data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId, searchParams, toast]);

  const handleDownload = async (format: 'html' | 'markdown' | 'pdf' | 'word' | 'zip' | 'json' | 'professional-pdf') => {
    if (!project) return;
    
    try {
      if (format === 'professional-pdf') {
        setIsProfessionalPdfLoading(true);
        
        toast({
          title: 'Generating Professional PDF',
          description: 'Please wait while we generate your professional report...'
        });

        console.log('Starting professional PDF export for project:', projectId);
        await exportProfessionalPdf(projectId!);
        
        toast({
          title: 'Success',
          description: 'Professional PDF report downloaded successfully'
        });
        
        return;
      }
      
      setIsExporting(true);
      
      if (format === 'zip') {
        try {
          // Export the project as a zip file
          const zipBlob = await exportProjectToZip(projectId!);
          
          // Create a download link
          const url = URL.createObjectURL(zipBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${project.title.replace(/\s+/g, '_')}_export.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          toast({
            title: 'Export Successful',
            description: 'Project has been exported successfully'
          });
        } catch (error: any) {
          console.error('Export error:', error);
          toast({
            title: 'Export Failed',
            description: error.message || 'Failed to export project',
            variant: 'destructive',
          });
        }
      } else if (format === 'pdf') {
        await handleExportToPdf();
      } else if (format === 'word') {
        await handleExportToWord();
      } else if (format === 'html') {
        // Export as HTML
        const reportElement = document.getElementById('report-container');
        if (!reportElement) return;
        
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${project.title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1, h2, h3 { margin-top: 20px; }
              table { border-collapse: collapse; width: 100%; margin: 15px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            ${reportElement.innerHTML}
          </body>
          </html>
        `;
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.title.replace(/\s+/g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: 'Success',
          description: 'HTML exported successfully'
        });
      } else if (format === 'markdown') {
        // Export as Markdown with improved structure
        await generateStructuredMarkdown();
      } else if (format === 'json') {
        // Handle JSON export
        await generateJsonExport();
      }
    } catch (error: any) {
      console.error('Professional PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export professional PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setIsProfessionalPdfLoading(false);
    }
  };

  // Generate JSON export
  const generateJsonExport = async () => {
    if (!project) return;
    
    try {
      console.log("Generating JSON export...");
      
      // Define severity order for sorting
      const SEVERITY_ORDER: Record<string, number> = {
        'critical': 1,
        'high': 2,
        'medium': 3,
        'low': 4,
        'info': 5
      };
      
      // Sort vulnerabilities by severity
      const sortedVulns = [...vulnerabilities].sort((a, b) => 
        (SEVERITY_ORDER[a.severity.toLowerCase()] || 999) - 
        (SEVERITY_ORDER[b.severity.toLowerCase()] || 999)
      );
      
      // Group vulnerabilities by severity
      const vulnsBySeverity: Record<string, any[]> = {};
      sortedVulns.forEach(vuln => {
        const sev = vuln.severity.toLowerCase();
        if (!vulnsBySeverity[sev]) vulnsBySeverity[sev] = [];
        vulnsBySeverity[sev].push(vuln);
      });
      
      // Calculate severity counts
      const sevCounts = {
        critical: 0,
        high: 0,
        medium: 0, 
        low: 0,
        info: 0
      };
      
      sortedVulns.forEach(vuln => {
        const sev = vuln.severity.toLowerCase();
        if (sev in sevCounts) {
          sevCounts[sev as keyof typeof sevCounts]++;
        }
      });
      
      // Build JSON structure matching our markdown format
      const reportJson: any = {
        title: project.title,
        scope: [],
        executiveSummary: {
          startDate: new Date(project.start_date).toLocaleDateString(),
          endDate: new Date(project.end_date).toLocaleDateString(),
          riskCounts: sevCounts
        },
        vulnerabilitySpotlight: [],
        detailedFindings: {}
      };
      
      // Add scope items
      if (project.scope && Array.isArray(project.scope) && project.scope.length > 0) {
        project.scope.forEach((item: any) => {
          if (typeof item === 'object' && item.value) {
            reportJson.scope.push(item.value);
          } else {
            reportJson.scope.push(item);
          }
        });
      }
      
      // Add vulnerability spotlight entries
      sortedVulns.forEach(vuln => {
        reportJson.vulnerabilitySpotlight.push({
          severity: vuln.severity,
          title: vuln.title,
          id: vuln.vulnerability_id || 'N/A',
          status: vuln.current_status ? 'Resolved' : 'Open'
        });
      });
      
      // Add detailed findings by severity
      Object.keys(vulnsBySeverity).forEach(severity => {
        if (!reportJson.detailedFindings[severity]) {
          reportJson.detailedFindings[severity] = [];
        }
        
        vulnsBySeverity[severity].forEach(vuln => {
          const vulnJson: any = {
            title: vuln.title,
            id: vuln.vulnerability_id || 'N/A',
            severity: vuln.severity,
            background: vuln.background || 'No background information provided.',
            affectedSystems: [],
            details: vuln.details || 'No details provided.',
            screenshots: [],
            requestResponse: {},
            remediation: vuln.remediation || 'No remediation steps provided.',
            riskAnalysis: {
              cvssVector: vuln.cvss_vector || 'N/A',
              cvssScore: vuln.cvss_score || 'N/A'
            },
            references: []
          };
          
          // Add affected systems
          if (vuln.affected_versions && Array.isArray(vuln.affected_versions) && vuln.affected_versions.length > 0) {
            vuln.affected_versions.forEach((ver: any) => {
              if (typeof ver === 'object' && ver.name) {
                vulnJson.affectedSystems.push(ver.name);
              } else if (typeof ver === 'object' && ver.value) {
                vulnJson.affectedSystems.push(ver.value);
              } else {
                vulnJson.affectedSystems.push(ver);
              }
            });
          }
          
          // Add screenshots
          if (vuln.poc_images && Array.isArray(vuln.poc_images) && vuln.poc_images.length > 0) {
            vuln.poc_images.forEach((img: any, i: number) => {
              const imgData = img.data;
              const imgLabel = img.label || `Figure ${i + 1}`;
              
              if (imgData) {
                vulnJson.screenshots.push({
                  label: imgLabel,
                  data: imgData
                });
              }
            });
          }
          
          // Add request/response
          if (vuln.request_response) {
            const reqRes = vuln.request_response;
            
            if (typeof reqRes === 'object' && reqRes !== null) {
              if (reqRes.request && typeof reqRes.request === 'string') {
                vulnJson.requestResponse.request = reqRes.request;
              }
              
              if (reqRes.response && typeof reqRes.response === 'string') {
                vulnJson.requestResponse.response = reqRes.response;
              }
            } else if (typeof reqRes === 'string') {
              vulnJson.requestResponse.data = reqRes;
            }
          }
          
          // Add references
          if (vuln.ref_links && Array.isArray(vuln.ref_links) && vuln.ref_links.length > 0) {
            vuln.ref_links.forEach((link: string) => {
              vulnJson.references.push(link);
            });
          }
          
          reportJson.detailedFindings[severity].push(vulnJson);
        });
      });
      
      // Create and trigger download
      const jsonString = JSON.stringify(reportJson, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'JSON report exported successfully'
      });
    } catch (error) {
      console.error('JSON export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export JSON. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Generate structured Markdown export
  const generateStructuredMarkdown = async () => {
    if (!project) return;
    
    try {
      console.log("Generating markdown export...");
      
      // Define severity order for sorting
      const SEVERITY_ORDER: Record<string, number> = {
        'critical': 1,
        'high': 2,
        'medium': 3,
        'low': 4,
        'info': 5
      };
      
      // Sort vulnerabilities by severity
      const sortedVulns = [...vulnerabilities].sort((a, b) => 
        (SEVERITY_ORDER[a.severity.toLowerCase()] || 999) - 
        (SEVERITY_ORDER[b.severity.toLowerCase()] || 999)
      );
      
      // Group vulnerabilities by severity
      const vulnsBySeverity: Record<string, any[]> = {};
      sortedVulns.forEach(vuln => {
        const sev = vuln.severity.toLowerCase();
        if (!vulnsBySeverity[sev]) vulnsBySeverity[sev] = [];
        vulnsBySeverity[sev].push(vuln);
      });
      
      // Calculate severity counts
      const sevCounts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      };
      
      sortedVulns.forEach(vuln => {
        const sev = vuln.severity.toLowerCase();
        if (sev in sevCounts) {
          sevCounts[sev as keyof typeof sevCounts]++;
        }
      });
      
      // Start building markdown content
      let markdown = `# ${project.title}\n---\n\n`;
      
      // Add project scope
      markdown += `## Scope\n`;
      if (project.scope && Array.isArray(project.scope) && project.scope.length > 0) {
        project.scope.forEach((item: any) => {
          markdown += `- ${typeof item === 'object' && item.value ? item.value : item}\n`;
        });
      } else {
        markdown += `- No scope items defined\n`;
      }
      markdown += `\n---\n\n`;
      
      // Add table of contents with vulnerability titles under each severity level
      markdown += `## Table of Contents\n\n`;
      
      markdown += `## Table of Contents\n\n`;
      markdown += `1. Executive Summary\n`;
      markdown += `2. Vulnerability Spotlight\n`;
      markdown += `3. Detailed Findings\n`;
      markdown += `1. [Executive Summary](#executive-summary)\n`;
      markdown += `2. [Vulnerability Spotlight](#vulnerability-spotlight)\n`;
      markdown += `3. [Detailed Findings](#detailed-findings)\n`;

      // Add sections for each severity level that has vulnerabilities with vulnerability titles
      Object.keys(vulnsBySeverity)
        .sort((a, b) => (SEVERITY_ORDER[a] || 999) - (SEVERITY_ORDER[b] || 999))
        .forEach(severity => {
          if (vulnsBySeverity[severity] && vulnsBySeverity[severity].length > 0) {
            const severityTitle = severity.charAt(0).toUpperCase() + severity.slice(1);
            const highIdAttribute = severity.toLowerCase() === 'high' ? '(#high)' : '';
            markdown += `   - ${severityTitle}${highIdAttribute}\n`;
            const anchorTag = severity.toLowerCase();
            markdown += `   - [${severityTitle}](#${anchorTag})\n`;

            // Add vulnerability titles under each severity
            // Add clickable vulnerability titles under each severity
            vulnsBySeverity[severity].forEach(vuln => {
              markdown += `\t${vuln.title}\n`;
              const vulnAnchor = vuln.title.toLowerCase().replace(/[^\w]+/g, '-');
              markdown += `\t- [${vuln.title}](#${vulnAnchor})\n`;
            });
          }
        });

      markdown += `4. Conclusion\n\n`;
      markdown += `4. [Conclusion](#conclusion)\n\n`;
      markdown += `---\n\n`;
      
      // Add executive summary
      markdown += `## Executive Summary\n\n`;
      markdown += `|Start Date|End Date|\n`;
      markdown += `|---|---|\n`;
      markdown += `|${new Date(project.start_date).toLocaleDateString()}|${new Date(project.end_date).toLocaleDateString()}|\n\n`;
      
      // Add overall risk
      const totalVulns = Object.values(sevCounts).reduce((a, b) => a + b, 0);
      let riskScore = 0;
      
      // Simple risk calculation
      const weights = { critical: 10, high: 7, medium: 4, low: 1, info: 0 };
      let totalWeight = 0;

      Object.entries(sevCounts).forEach(([severity, count]) => {
        totalWeight += count * weights[severity as keyof typeof weights];
      });
      
      riskScore = totalVulns > 0 ? parseFloat((totalWeight / totalVulns).toFixed(1)) : 0;
      let riskLevel = 'Low';
      
      if (riskScore >= 7) riskLevel = 'Critical';
      else if (riskScore >= 5) riskLevel = 'High';
      else if (riskScore >= 3) riskLevel = 'Medium';
      
      markdown += `#### Overall Risk: ${riskLevel} (${riskScore}/10)\n\n`;
      
      // Add vulnerability summary
      markdown += `| Severity | Count |\n`;
      markdown += `|---|---|\n`;
      Object.entries(sevCounts).forEach(([severity, count]) => {
        if (count > 0) {
          markdown += `| ${severity.charAt(0).toUpperCase() + severity.slice(1)} | ${count} |\n`;
        }
      });
      markdown += `\n---\n\n`;
      
      // Add vulnerability spotlight section
      markdown += `## Vulnerability Spotlight\n\n`;
      markdown += `| Severity | Issue Title | Issue ID | Status |\n`;
      markdown += `|---|---|---|---|\n`;
      
      sortedVulns.forEach(vuln => {
        markdown += `| ${vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1)} | ${vuln.title} | ${vuln.vulnerability_id || 'N/A'} | ${vuln.current_status ? 'Resolved' : 'Open'} |\n`;
      });
      
      markdown += `\n---\n\n`;
      
      // Add detailed findings
      markdown += `## Detailed Findings\n\n`;
      
      // Add sections for each severity level that has vulnerabilities
      Object.keys(vulnsBySeverity)
        .sort((a, b) => (SEVERITY_ORDER[a] || 999) - (SEVERITY_ORDER[b] || 999))
        .forEach(severity => {
          if (vulnsBySeverity[severity] && vulnsBySeverity[severity].length > 0) {
            markdown += `### ${severity.charAt(0).toUpperCase() + severity.slice(1)}\n\n`;
            
            // Add each vulnerability in this severity level
            vulnsBySeverity[severity].forEach((vuln, index) => {
              markdown += `#### ${vuln.title} (${vuln.vulnerability_id || 'N/A'}, ${vuln.severity})\n\n`;
              
              // Issue background
              markdown += `##### Issue Background\n`;
              markdown += `${vuln.background || 'No background information provided.'}\n\n`;
              
              // Affected systems/pages
              markdown += `##### Affected Systems/Pages\n`;
              if (vuln.affected_versions && Array.isArray(vuln.affected_versions) && vuln.affected_versions.length > 0) {
                markdown += `| System/Page |\n`;
                markdown += `|---|\n`;
                vuln.affected_versions.forEach((ver: any) => {
                  markdown += `| ${typeof ver === 'object' && ver.name ? ver.name : (typeof ver === 'object' && ver.value ? ver.value : ver)} |\n`;
                });
              } else {
                markdown += `No affected systems specified.\n`;
              }
              markdown += `\n`;
              
              // Issue detail
              markdown += `##### Issue Detail\n`;
              markdown += `${vuln.details || 'No details provided.'}\n\n`;
              
              // Handle screenshots - convert to base64 if needed
              if (vuln.poc_images && Array.isArray(vuln.poc_images) && vuln.poc_images.length > 0) {
                vuln.poc_images.forEach((img: any, i: number) => {
                  const imgData = img.data;
                  const imgLabel = img.label || `Figure ${i + 1}`;
                  
                  // If the image data is already base64, use it directly
                  if (typeof imgData === 'string' && imgData.startsWith('data:')) {
                    markdown += `![${imgLabel}](${imgData})\n\n`;
                  } else if (typeof imgData === 'string') {
                    // If not, we'd need to convert it, but we'll assume it's already in the right format
                    markdown += `![${imgLabel}](${imgData})\n\n`;
                  }
                });
              }
              
              // Handle request/response data
              if (vuln.request_response) {
                const reqRes = vuln.request_response;
                
                if (typeof reqRes === 'object' && reqRes !== null) {
                  if (reqRes.request && typeof reqRes.request === 'string' && reqRes.request.trim() !== '') {
                    markdown += `**Request:**\n\`\`\`\n${reqRes.request}\n\`\`\`\n\n`;
                  }
                  
                  if (reqRes.response && typeof reqRes.response === 'string' && reqRes.response.trim() !== '') {
                    markdown += `**Response:**\n\`\`\`\n${reqRes.response}\n\`\`\`\n\n`;
                  }
                } else if (typeof reqRes === 'string' && reqRes.trim() !== '') {
                  markdown += `**Request/Response:**\n\`\`\`\n${reqRes}\n\`\`\`\n\n`;
                }
              }
              
              // Issue remediation
              markdown += `##### Issue Remediation\n`;
              markdown += `${vuln.remediation || 'No remediation steps provided.'}\n\n`;
              
              // Risk analysis
              markdown += `##### Risk Analysis\n`;
              if (vuln.cvss_vector) {
                markdown += `Vector String: ${vuln.cvss_vector}\n\n`;
                if (vuln.cvss_score) {
                  markdown += `CVSS Score: ${vuln.cvss_score}\n\n`;
                }
              } else {
                markdown += `No CVSS data available.\n\n`;
              }
              
              // References
              markdown += `##### References\n`;
              if (vuln.ref_links && Array.isArray(vuln.ref_links) && vuln.ref_links.length > 0) {
                vuln.ref_links.forEach((link: string) => {
                  markdown += `- [${link}](${link})\n`;
                });
              } else {
                markdown += `No references provided.\n`;
              }
              
              markdown += `\n---\n\n`;
            });
          }
        });
      
      // Add conclusion
      markdown += `## Conclusion\n\n`;
      markdown += `The security assessment of ${project.title} has identified several areas for improvement. `;
      markdown += `Based on our findings, we recommend addressing the identified vulnerabilities according to their severity, `;
      markdown += `starting with Critical and High issues.\n\n`;
      
      markdown += `By implementing these recommendations, the organization can significantly reduce the security risks `;
      markdown += `identified in the assessment and improve the overall security of the application.\n\n`;
      
      markdown += `**Report By:** ${project.preparer}\n`;
      markdown += `**Date:** ${new Date().toLocaleDateString()}\n`;
      
      console.log("Markdown generation complete, creating download");
      
      // Create and trigger download
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'Markdown report exported successfully'
      });
      
    } catch (error) {
      console.error('Markdown export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export Markdown. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Fix PDF generation to prevent empty pages and include images properly
  const handleExportToPdf = async () => {
    const reportElement = document.getElementById('report-container');
    if (!reportElement) return;

    try {
      setIsExporting(true);
      toast({
        title: 'Exporting PDF',
        description: 'Please wait while we generate your PDF...'
      });
      
      // Apply print-specific styles
      document.body.classList.add('print-pdf');
      
      // Use html2pdf with better options to fix empty pages
      const opt = {
        margin: 10,
        filename: `${project?.title || 'report'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          scrollY: 0,
          letterRendering: true,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
      };
      
      await html2pdf().set(opt).from(reportElement).save();
      
      toast({
        title: 'Success',
        description: 'PDF exported successfully'
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export PDF. Please try again.',
        variant: 'destructive'
      });
    } finally {
      // Remove print-specific styles
      document.body.classList.remove('print-pdf');
      setIsExporting(false);
    }
  };

  // Fix Word document generation to work in browser environments
  const handleExportToWord = async () => {
    if (!project) return;
    
    try {
      setIsExporting(true);
      toast({
        title: 'Exporting Word Document',
        description: 'Please wait while we generate your document...'
      });
      
      // Get the HTML content
      const reportElement = document.getElementById('report-container');
      if (!reportElement) return;
      
      let htmlContent = reportElement.innerHTML;
      
      // Convert all images to base64 to ensure they're included in the Word doc
      const images = reportElement.querySelectorAll('img');
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const imgSrc = img.getAttribute('src');
        
        if (imgSrc && !imgSrc.startsWith('data:')) {
          try {
            const response = await fetch(imgSrc);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            
            // Replace the image source with base64 data
            htmlContent = htmlContent.replace(imgSrc, base64);
          } catch (e) {
            console.error('Failed to convert image to base64:', e);
          }
        }
      }
      
      // Use our updated htmlToWord function which returns a Blob directly
      const blob = await htmlToWord(htmlContent, {
        pageTitle: project.title
      });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, '_')}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'Word document exported successfully'
      });
    } catch (error) {
      console.error('Word export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export Word document. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!projectData) {
    return (
      <MainLayout>
        <div className="py-10 px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Report Not Found</h2>
          <p className="text-muted-foreground mb-6">The requested report could not be found or you don't have permission to view it.</p>
          <Button asChild>
            <Link to="/projects">Back to Projects</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/projects/${projectId}`}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Project
            </Link>
          </Button>
        </div>
        <DownloadDropdown 
          onDownload={handleDownload} 
          isProfessionalPdfLoading={isProfessionalPdfLoading}
        />
      </div>

      <h1 className="text-3xl font-bold">Security Assessment Report</h1>
      <div id="report-container" className="space-y-8 pb-20">
        <ReportPreview project={projectData} vulnerabilities={vulnerabilities} />
      </div>
    </MainLayout>
  );
};

export default ReportView;
