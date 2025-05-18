import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { supabase } from '@/lib/supabase';
import { Reports, Vulnerabilities } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, FileDown } from 'lucide-react';
import { DownloadDropdown } from '@/components/report/DownloadDropdown';
import html2pdf from 'html2pdf.js';
import { htmlToWord } from '@/lib/htmlToWord';
import { Button } from '@/components/ui/button';
import { exportProjectToZip } from '@/utils/projectExport';
import { ReportPreview } from '@/components/report/ReportPreview';

const ReportView = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [project, setProject] = useState<Reports | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [projectData, setProjectData] = useState<any>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;

      try {
        setIsLoading(true);
        
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('reports')
          .select('*')
          .eq('id', projectId)
          .single();
        
        if (projectError) throw projectError;
        setProjectData(projectData);
        setProject(projectData);
        
        // Fetch vulnerabilities
        const { data: vulnData, error: vulnError } = await supabase
          .from('vulnerabilities')
          .select('*')
          .eq('report_id', projectId)
          .order('severity', { ascending: false });
        
        if (vulnError) throw vulnError;
        setVulnerabilities(vulnData || []);
        
        // Check if we need to auto-download
        const downloadFormat = searchParams.get('download');
        if (downloadFormat) {
          setTimeout(() => {
            handleDownload(downloadFormat as 'html' | 'markdown' | 'pdf' | 'word' | 'zip');
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

  const handleDownload = async (format: 'html' | 'markdown' | 'pdf' | 'word' | 'zip') => {
    if (!project) return;
    
    try {
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
        // Export as Markdown (simplified)
        const reportElement = document.getElementById('report-container');
        if (!reportElement) return;
        
        // Very basic HTML to Markdown conversion
        let html = reportElement.innerHTML;
        let markdown = html
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
          .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
          .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
          .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
          .replace(/<\/ul>/gi, '\n')
          .replace(/<\/ol>/gi, '\n')
          .replace(/<[^>]*>/g, '');
        
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
          description: 'Markdown exported successfully'
        });
      }
    } finally {
      setIsExporting(false);
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
        <DownloadDropdown onDownload={handleDownload} />
      </div>

      <h1 className="text-3xl font-bold">Security Assessment Report</h1>
      <div id="report-container" className="space-y-8 pb-20">
        <ReportPreview project={projectData} vulnerabilities={vulnerabilities} />
      </div>
    </MainLayout>
  );
};

export default ReportView;
