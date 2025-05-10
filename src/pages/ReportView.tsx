
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { DownloadDropdown } from '@/components/report/DownloadDropdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportPreview } from '@/components/report/ReportPreview';
import { ReportGenerator } from '@/services/ReportGenerator';
import { Spinner } from '@/components/ui/spinner';

const ReportView = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState<any>(null);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('preview');

  useEffect(() => {
    if (!projectId) return;
    
    const fetchProjectData = async () => {
      setLoading(true);
      try {
        // Fetch project data
        const { data: projectData, error: projectError } = await supabase
          .from('reports')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;
        setProjectData(projectData);

        // Fetch vulnerabilities with ALL columns including poc_images and retest_images
        const { data: vulnData, error: vulnError } = await supabase
          .from('vulnerabilities')
          .select('*')
          .eq('report_id', projectId)
          .order('display_order', { ascending: true });

        if (vulnError) throw vulnError;
        
        // Process vulnerability data and fetch attachments
        const vulnsWithAttachments = await Promise.all((vulnData || []).map(async (vuln) => {
          // Fetch attachments for this vulnerability
          const { data: attachments, error: attachError } = await supabase
            .from('attachments')
            .select('*')
            .eq('vulnerability_id', vuln.id);
            
          if (attachError) {
            console.error(`Error fetching attachments for vulnerability ${vuln.id}:`, attachError);
            return vuln; // Return vuln without attachments if there was an error
          }
          
          // Add any attachments as POC images if they don't already exist
          if (attachments && attachments.length > 0) {
            // Initialize poc_images if it doesn't exist or is null
            const pocImages = Array.isArray(vuln.poc_images) ? [...vuln.poc_images] : [];
            
            // Process attachments and add them to poc_images
            attachments.forEach(attachment => {
              // Check if this attachment is already in poc_images by name or content
              const exists = pocImages.some(img => 
                img.name === attachment.name || img.data === attachment.data
              );
              
              if (!exists) {
                pocImages.push({
                  name: attachment.name,
                  data: attachment.data,
                  content_type: attachment.content_type,
                  label: attachment.label || attachment.name
                });
              }
            });
            
            // Update the vulnerability with the combined POC images
            return { ...vuln, poc_images: pocImages };
          }
          
          return vuln;
        }));
        
        console.log('Processed vulnerabilities data with attachments:', vulnsWithAttachments);
        
        // Set the vulnerabilities with attachments
        setVulnerabilities(vulnsWithAttachments || []);

        // Generate report content
        if (projectData && vulnsWithAttachments) {
          const generator = new ReportGenerator(projectData, vulnsWithAttachments);
          const html = await generator.generateHtml();
          const markdown = await generator.generateMarkdown();
          setHtmlContent(html);
          setMarkdownContent(markdown);
        }

      } catch (error: any) {
        console.error('Error loading report data:', error);
        toast({
          title: 'Error loading report data',
          description: error.message || 'Failed to load report data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId, toast]);

  const handleDownload = (format: 'html' | 'markdown' | 'pdf') => {
    if (!projectData) return;
    
    const fileName = `${projectData.title.replace(/\s+/g, '_')}_Report`;
    let content: string = '';
    let mimeType: string = '';
    let fileExtension: string = '';

    switch (format) {
      case 'html':
        content = htmlContent;
        mimeType = 'text/html';
        fileExtension = 'html';
        break;
      case 'markdown':
        content = markdownContent;
        mimeType = 'text/markdown';
        fileExtension = 'md';
        break;
      case 'pdf':
        // PDF generation would require a library like jsPDF or sending to a server
        toast({
          title: 'PDF Generation',
          description: 'PDF download is not yet implemented',
          variant: 'default',
        });
        return;
    }

    // Create a blob and download it
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Downloaded',
      description: `Your report has been downloaded as ${fileExtension.toUpperCase()}`,
      variant: 'default',
    });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Spinner />
            <p className="text-muted-foreground">Loading report data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

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

      <h1 className="text-3xl font-bold mb-6">Security Assessment Report</h1>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="preview" onClick={() => setActiveTab('preview')}>Preview</TabsTrigger>
          <TabsTrigger value="html" onClick={() => setActiveTab('html')}>HTML</TabsTrigger>
          <TabsTrigger value="markdown" onClick={() => setActiveTab('markdown')}>Markdown</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="mt-2">
          <Card>
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <div className="bg-white p-8">
                  <ReportPreview project={projectData} vulnerabilities={vulnerabilities} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="html">
          <Card>
            <CardHeader>
              <CardTitle>HTML Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <pre className="bg-muted p-4 overflow-x-auto text-sm">
                  {htmlContent}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="markdown">
          <Card>
            <CardHeader>
              <CardTitle>Markdown Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <pre className="bg-muted p-4 overflow-x-auto text-sm">
                  {markdownContent}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default ReportView;