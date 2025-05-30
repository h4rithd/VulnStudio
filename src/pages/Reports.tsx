import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { exportProjectToZip } from '@/utils/projectExport';
import { DownloadDropdown } from '@/components/report/DownloadDropdown';
import {
  Search,
  FileText,
  Calendar,
  Eye,
  CloudDownload,
  Filter,
  LibraryBig,
  FileArchive,
  UserRoundPen, 
  UserRoundCheck,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { reportsApi } from '@/utils/api';

interface ProjectReport {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  preparer: string;
  reviewer: string;
  version: string;
  status: string;
  created_at: string;
  vulnerabilities_count?: number;
  isTemporary?: boolean;
}

type SortField = 'title' | 'preparer' | 'reviewer' | 'vulnerabilities_count' | 'version' | 'created_at' | 'status';
type SortDirection = 'asc' | 'desc';

const Reports = () => {
  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [tempReports, setTempReports] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
    loadTemporaryReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const result = await reportsApi.getAll();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch reports');
      }
      
      // Transform data to include vulnerability counts
      const reportsWithCounts = result.data?.map(report => ({
        ...report,
        vulnerabilities_count: report.vulnerabilities_count.total
      })) || [];
      
      setReports(reportsWithCounts);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemporaryReports = () => {
    try {
      const tempProjectsJSON = localStorage.getItem('tempProjects');
      if (tempProjectsJSON) {
        const tempProjects = JSON.parse(tempProjectsJSON);

        const tempReportsWithCounts = tempProjects.map((project: any) => {
          // Get vulnerability count for temp project
          const vulnKey = `tempVulnerabilities_${project.id}`;
          const vulnJSON = localStorage.getItem(vulnKey);
          const vulnerabilities = vulnJSON ? JSON.parse(vulnJSON) : [];

          return {
            ...project,
            vulnerabilities_count: vulnerabilities.length,
            isTemporary: true
          };
        });

        setTempReports(tempReportsWithCounts);
      }
    } catch (error: any) {
      console.error('Error loading temporary reports:', error);
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

  const handleDownload = (reportId: string, format: 'html' | 'markdown' | 'pdf' | 'word' | 'zip' | 'json') => {
    if (format === 'zip') {
      handleExportProject(reportId);
    } else {
      window.open(`/projects/${reportId}/report?download=${format}`, '_blank');
    }
  };

  const handleExportProject = async (projectId: string) => {
    try {
      const project = [...reports, ...tempReports].find(r => r.id === projectId);
      const zipBlob = await exportProjectToZip(projectId);

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.title.replace(/\s+/g, '_')}_export.zip`;
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

  // Combine and filter reports
  const allReports = [...reports, ...tempReports];
  const filteredReports = allReports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.preparer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reviewer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort reports
  const sortedReports = [...filteredReports].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle special cases
    if (sortField === 'vulnerabilities_count') {
      aValue = a.vulnerabilities_count || 0;
      bValue = b.vulnerabilities_count || 0;
    } else if (sortField === 'created_at') {
      aValue = new Date(a.created_at).getTime();
      bValue = new Date(b.created_at).getTime();
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

  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <LibraryBig className="h-10 w-10" />
              Reports
            </h1>
            <p className="text-muted-foreground">View and download project reports</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reports by title, preparer, or reviewer..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-10 w-10 border-4 border-secondary border-t-transparent rounded-full"></div>
        </div>
      ) : sortedReports.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No reports found</h3>
          <p className="text-muted-foreground">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first project to generate reports.'}
          </p>
        </div>
      ) : (
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
                <TableHead 
                  className="hidden md:table-cell cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('preparer')}
                >
                  <div className="flex items-center gap-2">
                    Preparer
                    {getSortIcon('preparer')}
                  </div>
                </TableHead>
                <TableHead 
                  className="hidden md:table-cell cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('reviewer')}
                >
                  <div className="flex items-center gap-2">
                    Reviewer
                    {getSortIcon('reviewer')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-center cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('vulnerabilities_count')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Vulnerabilities
                    {getSortIcon('vulnerabilities_count')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-center cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('version')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Version
                    {getSortIcon('version')}
                  </div>
                </TableHead>
                <TableHead className="hidden lg:table-cell text-center">Date Range</TableHead>
                <TableHead 
                  className="text-center cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Status
                    {getSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead className="text-center"></TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{report.title}</span>
                      {report.isTemporary && (
                        <Badge variant="outline" className="bg-[#9B2808]/10 text-[#9B2808] border-none animate-pulse text-xs">
                          Temp
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <UserRoundPen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{report.preparer}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <UserRoundCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{report.reviewer}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {report.vulnerabilities_count || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{report.version}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(report.start_date).toLocaleDateString()} - {new Date(report.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={report.status === 'completed' ? 'default' : 'outline'} className="capitalize">
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/projects/${report.id}/report`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
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
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleDownload(report.id, 'pdf')}>
                            <CloudDownload className="mr-2 h-4 w-4" />
                            <span>Download PDF</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(report.id, 'word')}>
                            <CloudDownload className="mr-2 h-4 w-4" />
                            <span>Download Word</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(report.id, 'html')}>
                            <CloudDownload className="mr-2 h-4 w-4" />
                            <span>Download HTML</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(report.id, 'markdown')}>
                            <CloudDownload className="mr-2 h-4 w-4" />
                            <span>Download Markdown</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(report.id, 'json')}>
                            <CloudDownload className="mr-2 h-4 w-4" />
                            <span>Download JSON</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(report.id, 'zip')}>
                            <FileArchive className="mr-2 h-4 w-4" />
                            <span>Export Project</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </MainLayout>
  );
};

export default Reports;