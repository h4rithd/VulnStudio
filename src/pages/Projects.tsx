
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportProjectToZip } from '@/utils/projectExport';
import {
  Plus,
  FileText,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  CloudDownload,
  Copy,
  RefreshCcw,
  Search,
  FileArchive,
  AlertTriangle,
  AppWindow,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Reports } from '@/types/database.types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ProjectImportButton from '@/components/project/ProjectImportButton';
import { DuplicateProjectDialog } from '@/components/project/DuplicateProjectDialog';
import { reportsApi, VulnerabilityCount } from '@/utils/api';

interface ProjectWithVulnerabilities extends Reports {
  vulnerabilities_count?: VulnerabilityCount;
  is_retest?: boolean;
  isTemporary?: boolean;
}

interface TempProject {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  preparer: string;
  preparer_email: string;
  reviewer: string;
  reviewer_email: string;
  version: string;
  version_history: string;
  scope: Array<{ value: string }>;
  status: 'draft' | 'review' | 'completed' | 'archived';
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

interface TempVulnerability {
  id: string;
  report_id: string;
  title: string;
  severity: string;
  cvss_score: number;
  cvss_vector: string;
  background: string;
  details: string;
  remediation: string;
  created_at: string;
}

type SortField = 'title' | 'status' | 'created_at' | 'start_date' | 'version';
type SortDirection = 'asc' | 'desc';

const Projects = () => {
  const [projects, setProjects] = useState<ProjectWithVulnerabilities[]>([]);
  const [tempProjects, setTempProjects] = useState<ProjectWithVulnerabilities[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [projectToDuplicate, setProjectToDuplicate] = useState<ProjectWithVulnerabilities | null>(null);
  const [duplicateType, setDuplicateType] = useState<'duplicate' | 'retest'>('duplicate');
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchProjects();
    loadTemporaryProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const result = await reportsApi.getAll();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch projects');
      }

      setProjects(result.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch projects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemporaryProjects = () => {
    try {
      // Load temporary projects from localStorage
      const tempProjectsJSON = localStorage.getItem('tempProjects');
      if (tempProjectsJSON) {
        const loadedProjects = JSON.parse(tempProjectsJSON) as TempProject[];
        
        // Get vulnerabilities for each project
        const tempProjectsWithVulns = loadedProjects.map(project => {
          // Get vulnerabilities for this project from localStorage
          const vulnKey = `tempVulnerabilities_${project.id}`;
          const vulnJSON = localStorage.getItem(vulnKey);
          const vulnerabilities = vulnJSON ? JSON.parse(vulnJSON) as TempVulnerability[] : [];
          
          // Create vulnerability counts
          const vulnCounts = {
            total: vulnerabilities.length,
            critical: vulnerabilities.filter(v => v.severity === 'critical').length,
            high: vulnerabilities.filter(v => v.severity === 'high').length,
            medium: vulnerabilities.filter(v => v.severity === 'medium').length,
            low: vulnerabilities.filter(v => v.severity === 'low').length,
            info: vulnerabilities.filter(v => v.severity === 'info').length,
          };
          
          // Check if this is a retest project
          const isRetest = project.title.startsWith('Re-test:');
          
          return {
            ...project,
            vulnerabilities_count: vulnCounts,
            is_retest: isRetest,
            isTemporary: true,
            updated_at: project.updated_at || project.created_at,
            created_by: project.created_by || 'temp-user'
          } as ProjectWithVulnerabilities;
        });
        
        setTempProjects(tempProjectsWithVulns);
      }
    } catch (error: any) {
      console.error('Error loading temporary projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load temporary projects',
        variant: 'destructive',
      });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const result = await reportsApi.delete(id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete project');
      }
      
      // Update the UI based on project type
      if (id.startsWith('temp_')) {
        setTempProjects(prev => prev.filter(p => p.id !== id));
      } else {
        setProjects(prev => prev.filter(p => p.id !== id));
      }
      
      toast({
        title: 'Success',
        description: 'Project and its vulnerabilities deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete project',
        variant: 'destructive',
      });
    } finally {
      setProjectToDelete(null);
    }
  };

  const markProjectAsCompleted = async (projectId: string) => {
    try {
      const result = await reportsApi.update(projectId, { status: 'completed' });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update project status');
      }

      // Update the local state
      if (projectId.startsWith('temp_')) {
        setTempProjects(prev => prev.map(p => 
          p.id === projectId ? { ...p, status: 'completed' } : p
        ));
      } else {
        setProjects(prev => prev.map(p =>
          p.id === projectId ? { ...p, status: 'completed' } : p
        ));
      }

      toast({
        title: 'Success',
        description: 'Project marked as completed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update project status',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateProject = async (projectTitle: string, version: string, type: 'duplicate' | 'retest') => {
    if (!projectToDuplicate) return;

    try {
      if (projectToDuplicate.isTemporary) {
        // Handle temporary project duplication
        const tempProjectsJSON = localStorage.getItem('tempProjects');
        if (tempProjectsJSON) {
          const tempProjects = JSON.parse(tempProjectsJSON);
          
          // Create new project
          const newProject = {
            ...projectToDuplicate,
            id: `temp_${Math.random().toString(36).substr(2, 16)}`,
            title: projectTitle,
            version: version,
            status: 'draft' as const,
            created_at: new Date().toISOString()
          };
          
          // Add to localStorage
          tempProjects.push(newProject);
          localStorage.setItem('tempProjects', JSON.stringify(tempProjects));
          
          // Copy vulnerabilities
          const vulnKey = `tempVulnerabilities_${projectToDuplicate.id}`;
          const vulnJSON = localStorage.getItem(vulnKey);
          
          if (vulnJSON) {
            const vulnerabilities = JSON.parse(vulnJSON);
            
            if (vulnerabilities.length > 0) {
              // Create new vulnerabilities
              const newVulnerabilities = vulnerabilities.map((vuln: any) => ({
                ...vuln,
                id: `temp_vuln_${Math.random().toString(36).substr(2, 16)}`,
                report_id: newProject.id,
                created_at: new Date().toISOString()
              }));
              
              // Save to localStorage
              localStorage.setItem(
                `tempVulnerabilities_${newProject.id}`, 
                JSON.stringify(newVulnerabilities)
              );
            }
          }
          
          // Refresh temporary projects list
          loadTemporaryProjects();
        }
      } else {
        // Handle cloud project duplication
        const result = await reportsApi.duplicateProject(projectToDuplicate.id, projectTitle, version, type);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to duplicate project');
        }
        
        // Refresh projects list
        await fetchProjects();
      }

      toast({
        title: 'Success',
        description: type === 'retest'
          ? 'Project duplicated for re-testing'
          : 'Project duplicated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate project',
        variant: 'destructive',
      });
    } finally {
      setProjectToDuplicate(null);
      setDuplicateDialogOpen(false);
    }
  };

  const handleDownload = (projectId: string, format: 'html' | 'markdown' | 'pdf') => {
    // Navigate to the report with the download parameter
    window.open(`/projects/${projectId}/report?download=${format}`, '_blank');
  };

  const handleExportProject = async (projectId: string, title: string) => {
    try {
      // Export the project as a zip file
      const zipBlob = await exportProjectToZip(projectId);

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
  };

  // Get all projects (regular + temporary)
  const allProjects = [...projects, ...tempProjects];
  
  // Filter projects based on search query
  const filteredProjects = allProjects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'created_at' || sortField === 'start_date') {
      aValue = new Date(a[sortField]).getTime();
      bValue = new Date(b[sortField]).getTime();
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  // Render vulnerability counts with colored badges
  const renderVulnerabilityCounts = (project: ProjectWithVulnerabilities) => {
    if (!project.vulnerabilities_count) return null;

    const counts = project.vulnerabilities_count;
    return (
      <div className="flex flex-wrap items-center gap-1">
        {counts.critical > 0 && (
          <Badge className="bg-severity-critical text-white hover:bg-severity-critical/50">
            {counts.critical} Critical
          </Badge>
        )}
        {counts.high > 0 && (
          <Badge className="bg-severity-high text-white hover:bg-severity-high/50">
            {counts.high} High
          </Badge>
        )}
        {counts.medium > 0 && (
          <Badge className="bg-severity-medium text-white hover:bg-severity-medium/50">
            {counts.medium} Medium
          </Badge>
        )}
        {counts.low > 0 && (
          <Badge className="bg-severity-low text-white hover:bg-severity-low/50">
            {counts.low} Low
          </Badge>
        )}
        {counts.info > 0 && (
          <Badge className="bg-severity-info text-white hover:bg-severity-info/50">
            {counts.info} Info
          </Badge>
        )}
        {counts.total === 0 && (
          <span className="text-muted-foreground text-sm">No vulnerabilities</span>
        )}
      </div>
    );
  };

  const renderProjects = (filteredProjects: ProjectWithVulnerabilities[]) => {
    if (loading) {
      return (
        <div className="py-8 text-center text-muted-foreground">Loading projects...</div>
      );
    }

    if (filteredProjects.length === 0) {
      return (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">No projects found</p>
          {isAdmin && (
            <Button asChild variant="link" className="mt-2">
              <Link to="/projects/new">Create your first project</Link>
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center gap-2">
                  Project Title
                  {getSortIcon('title')}
                </div>
              </TableHead>
              <TableHead className="w-auto">Vulnerabilities</TableHead>
              <TableHead 
                className="w-[100px] text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('version')}
              >
                <div className="flex items-center justify-center gap-2">
                  Version
                  {getSortIcon('version')}
                </div>
              </TableHead>
              <TableHead 
                className="w-[200px] text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('start_date')}
              >
                <div className="flex items-center justify-center gap-2">
                  Date Range
                  {getSortIcon('start_date')}
                </div>
              </TableHead>
              <TableHead 
                className="w-[100px] text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center justify-center gap-2">
                  Status
                  {getSortIcon('status')}
                </div>
              </TableHead>
              <TableHead className="w-[60px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProjects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Link to={`/projects/${project.id}`} className="hover:underline">
                      {project.title}
                    </Link>
                    {project.is_retest && (
                      <Badge variant="outline" className="bg-[#12685E]/10 text-[#12685E] border-none">
                        Re-test
                      </Badge>
                    )}
                    {!project.is_retest && (
                      <Badge variant="outline" className="bg-[#62711E]/10 text-[#62711E] border-none">
                        Initial Assessment
                      </Badge>
                    )}
                    {project.isTemporary && (
                      <Badge variant="outline" className="bg-[#9B2808]/10 text-[#9B2808] border-none animate-pulse">
                        Temporary
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {renderVulnerabilityCounts(project)}
                </TableCell>
                <TableCell className="text-center">
                  {project.version}
                </TableCell>
                <TableCell className="text-center">
                  {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={project.status === 'completed' ? 'default' : 'outline'} className="capitalize">
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[180px]">
                      <DropdownMenuItem asChild>
                        <Link to={`/projects/${project.id}`} className="cursor-pointer flex items-center">
                          <Eye className="mr-2 h-4 w-4" />
                          <span>View Details</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/projects/${project.id}/report`} className="cursor-pointer flex items-center">
                          <FileText className="mr-2 h-4 w-4" />
                          <span>View Report</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExportProject(project.id, project.title)}
                        className="cursor-pointer flex items-center"
                      >
                        <FileArchive className="mr-2 h-4 w-4" />
                        <span>Export Report</span>
                      </DropdownMenuItem>
                      {!project.isTemporary && (
                        <DropdownMenuItem
                          onClick={() => handleDownload(project.id, 'pdf')}
                          className="cursor-pointer flex items-center"
                        >
                          <CloudDownload className="mr-2 h-4 w-4" />
                          <span>Download Report</span>
                        </DropdownMenuItem>
                      )}
                      
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to={`/projects/${project.id}/edit`} className="cursor-pointer flex items-center">
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit Project</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setProjectToDuplicate(project);
                              setDuplicateType('duplicate');
                              setDuplicateDialogOpen(true);
                            }}
                            className="cursor-pointer flex items-center"
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            <span>Duplicate</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setProjectToDuplicate(project);
                              setDuplicateType('retest');
                              setDuplicateDialogOpen(true);
                            }}
                            className="cursor-pointer flex items-center"
                          >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            <span>Make Re-test</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {project.status !== 'completed' && (
                            <DropdownMenuItem
                              onClick={() => markProjectAsCompleted(project.id)}
                              className="cursor-pointer flex items-center"
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              <span>Mark Completed</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setProjectToDelete(project.id)}
                            className="cursor-pointer flex items-center text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AppWindow className="h-10 w-10" />
            Projects
            </h1>
          <p className="text-muted-foreground">Manage your security testing projects</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <ProjectImportButton />
            <Button asChild>
              <Link to="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </div>
        )}
      </div>

      {tempProjects.length > 0 && (
        <Alert className="mb-6 bg-[#9B2808]/10 border-[#9B2808]/20 text-[#9B2808]">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Temporary Projects Warning</AlertTitle>
          <AlertDescription>
            Temporary projects are stored only in your browser. They may be deleted if you clear your browser 
            data or log out. Remember to export your projects to save your work.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-10"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="temp">Temporary</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="completed">Complete</TabsTrigger>
          <TabsTrigger value="retest">Retests</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4">
          {renderProjects(sortedProjects)}
        </TabsContent>

        <TabsContent value="temp" className="space-y-4">
          {renderProjects(sortedProjects.filter(p => p.isTemporary))}
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          {renderProjects(sortedProjects.filter(p => p.status === 'draft'))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {renderProjects(sortedProjects.filter(p => p.status === 'completed'))}
        </TabsContent>

        <TabsContent value="retest" className="space-y-4">
          {renderProjects(sortedProjects.filter(p => p.is_retest))}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={projectToDelete !== null} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the project and all its vulnerabilities. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => projectToDelete && handleDeleteProject(projectToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate/Re-test Dialog */}
      <DuplicateProjectDialog
        project={projectToDuplicate}
        isOpen={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        onConfirm={handleDuplicateProject}
        type={duplicateType}
      />
    </MainLayout>
  );
};

export default Projects;
