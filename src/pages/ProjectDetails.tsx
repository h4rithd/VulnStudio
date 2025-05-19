
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Reports } from '@/types/database.types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportProjectToZip } from '@/utils/projectExport';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { ChevronDown, ChevronLeft, FileText, PenLine, Plus, Shield, Trash2, Archive, BarChart3, Hammer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Vulnerability } from '@/components/vulnerability/types/vulnerability.types';

// Define severity order for sorting
const SEVERITY_ORDER = {
  'critical': 1,
  'high': 2,
  'medium': 3,
  'low': 4,
  'info': 5
};

// Define severity colors
const SEVERITY_COLORS = {
  'critical': '#c161a1',
  'high': '#ee6c6e',
  'medium': '#ea9c6b',
  'low': '#69b986',
  'info': '#3c6d9d'
};

const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'critical': return 'bg-severity-critical border-severity-critical/80';
    case 'high': return 'bg-severity-high border-severity-high/80';
    case 'medium': return 'bg-severity-medium border-severity-medium/80';
    case 'low': return 'bg-severity-low border-severity-low/80';
    case 'info': return 'bg-severity-info border-severity-info/80';
    default: return 'bg-zinc-500 border-zinc-500';
  }
};

const ProjectDetails = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Reports | null>(null);
  const [projectData, setProjectData] = useState<any>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [reordering, setReordering] = useState(false);
  const [activeTab, setActiveTab] = useState('vulnerabilities');
  const [deleteVulnId, setDeleteVulnId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isTemporary, setIsTemporary] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    // Check if it's a temporary project
    const isTempProject = projectId.startsWith('temp_');
    setIsTemporary(isTempProject);

    const fetchProjectData = async () => {
      try {
        setLoading(true);
        
        if (isTempProject) {
          // Load from localStorage
          const tempProjectsJSON = localStorage.getItem('tempProjects');
          if (tempProjectsJSON) {
            const tempProjects = JSON.parse(tempProjectsJSON);
            const tempProject = tempProjects.find((p: any) => p.id === projectId);
            
            if (tempProject) {
              setProjectData(tempProject);
              // For temp projects, vulnerabilities would also be in localStorage
              const tempVulnsJSON = localStorage.getItem(`vulns_${projectId}`);
              const tempVulns = tempVulnsJSON ? JSON.parse(tempVulnsJSON) : [];
              setVulnerabilities(tempVulns);
            } else {
              throw new Error('Temporary project not found');
            }
          } else {
            throw new Error('No temporary projects found');
          }
        } else {
          // Load from Supabase
          const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('id', projectId)
            .single();

          if (error) throw error;
          setProjectData(data);

          // Fetch vulnerabilities for this project
          const { data: vulnData, error: vulnError } = await supabase
            .from('vulnerabilities')
            .select('*')
            .eq('report_id', projectId)
            .order('display_order', { ascending: false });

          if (vulnError) throw vulnError;
          setVulnerabilities(vulnData || []);
        }
      } catch (error: any) {
        console.error('Error loading project data:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load project data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProjectData();
  }, [projectId, toast]);

  // Function to sort vulnerabilities by severity
  const sortVulnerabilitiesBySeverity = (vulnerabilities: Vulnerability[]): Vulnerability[] => {
    return [...vulnerabilities].sort((a, b) => {
      // First sort by severity
      const severityComparison = SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] -
        SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER];

      // If same severity, sort by display_order
      if (severityComparison === 0) {
        return (a.display_order || 0) - (b.display_order || 0);
      }

      return severityComparison;
    });
  };

  // Function to generate vulnerability IDs
  const generateVulnerabilityIds = async (sortedVulns: Vulnerability[]) => {
    if (!projectData || !projectData.title) return sortedVulns;

    // Get project prefix (first 3 letters uppercase)
    const projectPrefix = projectData.title.substring(0, 3).toUpperCase();

    // Group vulnerabilities by severity
    const vulnerabilitiesBySeverity: Record<string, Vulnerability[]> = {
      'critical': [],
      'high': [],
      'medium': [],
      'low': [],
      'info': []
    };

    sortedVulns.forEach(vuln => {
      if (vuln.severity) {
        vulnerabilitiesBySeverity[vuln.severity].push(vuln);
      }
    });

    // Generate new vulnerability IDs
    const updatedVulns = [...sortedVulns];
    let updatedIds: Record<string, string> = {};

    for (const severity in vulnerabilitiesBySeverity) {
      const vulns = vulnerabilitiesBySeverity[severity];
      const severityPrefix = severity.charAt(0).toUpperCase();

      vulns.forEach((vuln, index) => {
        // Format: PREFIX.S.## (e.g., H4R.C.01)
        const newId = `${projectPrefix}.${severityPrefix}.${(index + 1).toString().padStart(2, '0')}`;

        // Store the mapping of vulnerability id to new vulnerability_id
        if (vuln.id) {
          updatedIds[vuln.id] = newId;
        }
      });
    }

    // Update vulnerability IDs in database if they've changed
    if (isTemporary) {
      // For temporary projects, update in localStorage
      for (const vulnId in updatedIds) {
        const newVulnId = updatedIds[vulnId];
        const vulnIndex = updatedVulns.findIndex(v => v.id === vulnId);
        
        if (vulnIndex >= 0) {
          updatedVulns[vulnIndex] = { ...updatedVulns[vulnIndex], vulnerability_id: newVulnId };
        }
      }
      
      // Save updated vulnerabilities to localStorage
      localStorage.setItem(`vulns_${projectId}`, JSON.stringify(updatedVulns));
    } else {
      // For cloud projects, update in Supabase
      for (const vulnId in updatedIds) {
        const newVulnId = updatedIds[vulnId];
        const vuln = updatedVulns.find(v => v.id === vulnId);

        if (vuln && vuln.vulnerability_id !== newVulnId) {
          await supabase
            .from('vulnerabilities')
            .update({ vulnerability_id: newVulnId })
            .eq('id', vulnId);

          // Update local state as well
          const vulnIndex = updatedVulns.findIndex(v => v.id === vulnId);
          if (vulnIndex >= 0) {
            updatedVulns[vulnIndex] = { ...updatedVulns[vulnIndex], vulnerability_id: newVulnId };
          }
        }
      }
    }

    return updatedVulns;
  };

  const handleDragEnd = async (result: any) => {
    // If dropped outside the list, do nothing
    if (!result.destination) return;

    // If position hasn't changed, do nothing
    if (result.source.index === result.destination.index) return;

    // Reorder the vulnerabilities in the state for immediate UI update
    const items = Array.from(vulnerabilities);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display order
    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index
    }));

    setVulnerabilities(updatedItems);

    // Update in database or localStorage
    try {
      setReordering(true);

      if (isTemporary) {
        // For temporary projects, update in localStorage
        localStorage.setItem(`vulns_${projectId}`, JSON.stringify(updatedItems));
      } else {
        // For cloud projects, update in Supabase
        const updatePromises = updatedItems.map(item =>
          supabase
            .from('vulnerabilities')
            .update({ display_order: item.display_order })
            .eq('id', item.id)
        );
        
        await Promise.all(updatePromises);
      }

      const sortedVulns = sortVulnerabilitiesBySeverity(updatedItems);
      const updatedVulns = await generateVulnerabilityIds(sortedVulns);
      setVulnerabilities(updatedVulns);

      toast({
        title: 'Success',
        description: 'Vulnerability order updated',
      });
    } catch (error: any) {
      console.error('Failed to update vulnerability order:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update vulnerability order',
        variant: 'destructive',
      });
    } finally {
      setReordering(false);
    }
  };

  const handleDeleteVulnerability = async () => {
    if (!deleteVulnId) return;

    try {
      setDeleteLoading(true);

      if (isTemporary) {
        // For temporary projects, delete from localStorage
        const vulnsJSON = localStorage.getItem(`vulns_${projectId}`);
        if (vulnsJSON) {
          const vulns = JSON.parse(vulnsJSON);
          const updatedVulns = vulns.filter((v: any) => v.id !== deleteVulnId);
          localStorage.setItem(`vulns_${projectId}`, JSON.stringify(updatedVulns));
          
          // Update state
          setVulnerabilities(updatedVulns);
        }
      } else {
        // First delete any attachments related to this vulnerability
        const { error: attachmentError } = await supabase
          .from('attachments')
          .delete()
          .eq('vulnerability_id', deleteVulnId);

        if (attachmentError) {
          console.error("Error deleting attachments:", attachmentError);
          throw attachmentError;
        }

        // Then delete the vulnerability
        const { error } = await supabase
          .from('vulnerabilities')
          .delete()
          .eq('id', deleteVulnId);

        if (error) throw error;

        // Remove from state
        setVulnerabilities(prev => prev.filter(v => v.id !== deleteVulnId));
      }

      toast({
        title: 'Success',
        description: 'Vulnerability deleted successfully',
      });

    } catch (error: any) {
      console.error('Failed to delete vulnerability:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete vulnerability',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
      setDeleteVulnId(null);
    }
  };

  const handleToggleResolved = async (vuln: Vulnerability) => {
    try {
      const newStatus = !vuln.current_status;
      const newRetestDate = newStatus && !vuln.retest_date ? new Date().toISOString() : vuln.retest_date;

      if (isTemporary) {
        // For temporary projects, update in localStorage
        const vulnsJSON = localStorage.getItem(`vulns_${projectId}`);
        if (vulnsJSON) {
          const vulns = JSON.parse(vulnsJSON);
          const updatedVulns = vulns.map((v: any) => 
            v.id === vuln.id 
              ? { ...v, current_status: newStatus, retest_date: newRetestDate }
              : v
          );
          
          localStorage.setItem(`vulns_${projectId}`, JSON.stringify(updatedVulns));
          
          // Update state
          setVulnerabilities(updatedVulns);
        }
      } else {
        // Update the status in the database
        const { error } = await supabase
          .from('vulnerabilities')
          .update({
            current_status: newStatus,
            // If marking as resolved for the first time, set the retest_date to today
            ...(newStatus && !vuln.retest_date ? { retest_date: new Date().toISOString() } : {})
          })
          .eq('id', vuln.id);

        if (error) throw error;

        // Update in state
        setVulnerabilities(prev =>
          prev.map(v => v.id === vuln.id ? {
            ...v,
            current_status: newStatus,
            ...(newStatus && !vuln.retest_date ? { retest_date: new Date().toISOString() } : {})
          } : v)
        );
      }

      toast({
        title: 'Success',
        description: newStatus
          ? 'Vulnerability marked as resolved'
          : 'Vulnerability marked as open',
      });

    } catch (error: any) {
      console.error('Failed to update vulnerability status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleExportProject = async (projectId: string, title: string) => {
    try {
      // Export the project as a zip file
      const zipBlob = await exportProjectToZip(projectId!);

      // Create a download link
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '_')}_export.zip`;
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
  }

  // Count vulnerabilities by severity and status
  const countVulnerabilities = () => {
    const counts = {
      critical: { open: 0, resolved: 0 },
      high: { open: 0, resolved: 0 },
      medium: { open: 0, resolved: 0 },
      low: { open: 0, resolved: 0 },
      info: { open: 0, resolved: 0 }
    };
    
    vulnerabilities.forEach(vuln => {
      const severity = vuln.severity.toLowerCase() as keyof typeof counts;
      const status = vuln.current_status ? 'resolved' : 'open';
      
      if (counts[severity]) {
        counts[severity][status as 'open' | 'resolved']++;
      }
    });
    
    return counts;
  };

  // Calculate severity count totals
  const vulnCounts = countVulnerabilities();
  
  // Prepare data for the chart
  const chartData = [
    { name: 'Critical', open: vulnCounts.critical.open, resolved: vulnCounts.critical.resolved, color: SEVERITY_COLORS.critical },
    { name: 'High', open: vulnCounts.high.open, resolved: vulnCounts.high.resolved, color: SEVERITY_COLORS.high },
    { name: 'Medium', open: vulnCounts.medium.open, resolved: vulnCounts.medium.resolved, color: SEVERITY_COLORS.medium },
    { name: 'Low', open: vulnCounts.low.open, resolved: vulnCounts.low.resolved, color: SEVERITY_COLORS.low },
    { name: 'Info', open: vulnCounts.info.open, resolved: vulnCounts.info.resolved, color: SEVERITY_COLORS.info }
  ];
  
  // Total counts
  const openVulnerabilities = Object.values(vulnCounts).reduce((sum, category) => sum + category.open, 0);
  const resolvedVulnerabilities = Object.values(vulnCounts).reduce((sum, category) => sum + category.resolved, 0);
  const totalVulnerabilities = openVulnerabilities + resolvedVulnerabilities;

  // Function to auto-generate IDs for all vulnerabilities
  const handleGenerateAllIds = async () => {
    try {
      // Sort vulnerabilities by severity
      const sortedVulns = sortVulnerabilitiesBySeverity(vulnerabilities);
      
      // Generate and update vulnerability IDs
      const updatedVulns = await generateVulnerabilityIds(sortedVulns);
      
      // Update state
      setVulnerabilities(updatedVulns);
      
      toast({
        title: 'Success',
        description: 'Vulnerability IDs generated successfully',
      });
    } catch (error: any) {
      console.error('Failed to generate vulnerability IDs:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate vulnerability IDs',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin h-10 w-10 border-4 border-secondary border-t-transparent rounded-full"></div>
            <p className="text-muted-foreground">Loading project data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!projectData) {
    return (
      <MainLayout>
        <div className="py-10 px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
          <p className="text-muted-foreground mb-6">The requested project could not be found.</p>
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
            <Link to="/projects">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Projects
            </Link>
          </Button>
          <Badge variant={projectData.status === 'completed' ? 'default' : 'outline'} className="ml-2">
            {projectData.status.charAt(0).toUpperCase() + projectData.status.slice(1)}
          </Badge>
          {isTemporary && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
              Temporary
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" asChild>
            <Link to={`/projects/${projectId}/report`}>
              <FileText className="h-4 w-4 mr-1" />
              View Report
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/projects/${projectId}/edit`}>
              <PenLine className="h-4 w-4 mr-1" />
              Edit Project
            </Link>
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => handleExportProject(projectData.id, projectData.title)}>
            <Archive className="mr-2 h-4 w-4" />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-2">{projectData.title}</h1>
      
      {/* Project summary section with stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Project details */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Project Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <div className="py-2 flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Start Date:</dt>
                  <dd className="text-sm">{projectData.start_date}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">End Date:</dt>
                  <dd className="text-sm">{projectData.end_date}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Preparer:</dt>
                  <dd className="text-sm">{projectData.preparer}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Reviewer:</dt>
                  <dd className="text-sm">{projectData.reviewer}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Version:</dt>
                  <dd className="text-sm">{projectData.version}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          
          {/* Scope Card */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-xl">Scope</CardTitle>
            </CardHeader>
            <CardContent>
              {projectData.scope && projectData.scope.length > 0 ? (
                <ul className="space-y-2">
                  {projectData.scope.map((item: any, index: number) => (
                    <li key={index} className="bg-muted/50 p-2 rounded">
                      <span className="text-sm">{item.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">No scope items defined for this project.</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Summary statistics */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Vulnerability Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold mb-1">{openVulnerabilities}</div>
                  <div className="text-sm text-muted-foreground">Open Issues</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold mb-1">{resolvedVulnerabilities}</div>
                  <div className="text-sm text-muted-foreground">Resolved Issues</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold mb-1">{totalVulnerabilities}</div>
                  <div className="text-sm text-muted-foreground">Total Issues</div>
                </div>
              </div>
              
              {/* Severity stats */}
              <div className="grid grid-cols-2 gap-6">
                {/* Vulnerability distribution chart */}
                <div className="flex flex-col justify-center">
                  {totalVulnerabilities > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Open', value: openVulnerabilities },
                              { name: 'Resolved', value: resolvedVulnerabilities }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                            label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            <Cell fill="#F16767" />
                            <Cell fill="#129990" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">
                      No vulnerabilities to display
                    </div>
                  )}
                </div>
                
                {/* Severity breakdown */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Severity Breakdown</h3>
                  <div className="space-y-2">
                    {chartData.map(item => (
                      <div key={item.name} className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                        <div className="flex-1 text-sm">{item.name}</div>
                        <div className="flex gap-2 text-xs">
                          <span className="bg-[#F16767]/10 text-[#F16767] px-1.5 py-0.5 rounded">
                            {item.open} Open
                          </span>
                          <span className="bg-[#129990]/10 text-[#129990] px-1.5 py-0.5 rounded">
                            {item.resolved} Resolved
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="vulnerabilities" className="w-full" onValueChange={setActiveTab}>
        <TabsContent value="vulnerabilities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Vulnerabilities</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleGenerateAllIds}>
                <Hammer className="h-4 w-4 mr-1" />
                Generate IDs
              </Button>
              <Button asChild>
                <Link to={`/projects/${projectId}/vulnerabilities/new`}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Vulnerability
                </Link>
              </Button>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="vulnerabilities">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {vulnerabilities.length > 0 ? (
                    vulnerabilities.map((vuln, index) => (
                      <Draggable key={vuln.id} draggableId={vuln.id} index={index}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="border-l-4"
                            style={{
                              ...provided.draggableProps.style,
                              borderLeftColor: getSeverityColor(vuln.severity).split(' ')[0].replace('bg-', '#').replace('severity-critical', 'c161a1').replace('severity-high', 'ee6c6e').replace('severity-medium', 'ea9c6b').replace('severity-low', '69b986').replace('severity-info', '3c6d9d')
                            }}
                          >
                            <CardHeader className="py-3">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                  <div {...provided.dragHandleProps} className="cursor-grab">
                                    <div className="flex flex-col h-10 justify-between">
                                      <span className="block w-4 h-0.5 bg-gray-300"></span>
                                      <span className="block w-4 h-0.5 bg-gray-300"></span>
                                      <span className="block w-4 h-0.5 bg-gray-300"></span>
                                    </div>
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                      {vuln.vulnerability_id && (
                                        <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">
                                          {vuln.vulnerability_id}
                                        </span>
                                      )}

                                      {vuln.title}

                                      {vuln.current_status && (
                                        <Badge variant="outline" className="text-green-600 border-green-600">
                                          Resolved
                                        </Badge>
                                      )}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      <Badge className={`${getSeverityColor(vuln.severity)} text-white`}>
                                        {vuln.severity.toUpperCase()}
                                      </Badge>
                                      <span className="ml-2">CVSS: {vuln.cvss_score}</span>
                                    </p>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/vulnerabilities/${vuln.id}/edit`)}>
                                      <PenLine className="h-4 w-4 mr-2" />
                                      Edit Vulnerability
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleResolved(vuln)}>
                                      <Shield className="h-4 w-4 mr-2" />
                                      {vuln.current_status ? 'Re-open Issue' : 'Mark as Resolved'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => {
                                          e.preventDefault();
                                          setDeleteVulnId(vuln.id);
                                        }} className="text-red-600">
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete Vulnerability
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the vulnerability
                                            and all associated data.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleDeleteVulnerability();
                                            }}
                                            className="bg-red-600"
                                            disabled={deleteLoading}
                                          >
                                            {deleteLoading ? (
                                              <>
                                                <div className="animate-spin h-4 w-4 border-2 border-white border-opacity-50 border-t-transparent rounded-full mr-2"></div>
                                                Deleting...
                                              </>
                                            ) : (
                                              'Delete'
                                            )}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                          </Card>
                        )}
                      </Draggable>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Shield className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                      <h3 className="mt-2 text-lg font-medium">No vulnerabilities yet</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Get started by adding a new vulnerability to this project.
                      </p>
                      <Button className="mt-4" asChild>
                        <Link to={`/projects/${projectId}/vulnerabilities/new`}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Vulnerability
                        </Link>
                      </Button>
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default ProjectDetails;
