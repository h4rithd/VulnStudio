
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Reports } from '@/types/database.types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ChevronDown, ChevronLeft, FileText, PenLine, Plus, Shield, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Vulnerability } from '@/components/vulnerability/types/vulnerability.types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Define severity order for sorting
const SEVERITY_ORDER = {
  'critical': 1,
  'high': 2,
  'medium': 3,
  'low': 4,
  'info': 5
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

  useEffect(() => {
    if (!projectId) return;
    
    const fetchProjectData = async () => {
      try {
        setLoading(true);
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
          .order('display_order', { ascending: true });

        if (vulnError) throw vulnError;
        
        setVulnerabilities(vulnData || []);
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
      if (!project || !project.title) return sortedVulns;
  
      // Get project prefix (first 3 letters uppercase)
      const projectPrefix = project.title.substring(0, 3).toUpperCase();
      
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
    
    // Update in database
    try {
      setReordering(true);
      const updatePromises = updatedItems.map(item => 
        supabase
          .from('vulnerabilities')
          .update({ display_order: item.display_order })
          .eq('id', item.id)
      );
      
      // await Promise.all(updatePromises);
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
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-2">{projectData.title}</h1>
      <div className="grid grid-cols-2 gap-4 mb-6 pt-5">
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

          <CardContent>
            <dl className="divide-y">
              {projectData.scope && projectData.scope.length > 0 ? (
                <div>
                  {projectData.scope.map((item: any, index: number) => (
                    <div key={index} className="border p-4 rounded-md">
                       <dt className="text-sm font-medium text-muted-foreground">Project scope:</dt>
                       <dd className="text-sm">{item.value}</dd>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No scope items defined for this project.</p>
              )}
            </dl>
          </CardContent>
      </div>

      <Tabs defaultValue="vulnerabilities" className="w-full" onValueChange={setActiveTab}>
        <TabsContent value="vulnerabilities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Vulnerabilities</h2>
            <Button asChild>
              <Link to={`/projects/${projectId}/vulnerabilities/new`}>
                <Plus className="h-4 w-4 mr-1" />
                Add Vulnerability
              </Link>
            </Button>
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


