
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { FileText,LibraryBig,  Calendar, User, Search, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Reports as ReportsType } from '@/types/database.types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DownloadDropdown } from '@/components/report/DownloadDropdown';
import { exportProjectToZip } from '@/utils/projectExport';
import html2pdf from 'html2pdf.js';
import { htmlToWord } from '@/lib/htmlToWord';

const Reports = () => {
  const { user, isAdmin } = useAuth();
  const [reports, setReports] = useState<ReportsType[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .order('updated_at', { ascending: false });
        
        if (error) throw error;
        
        setReports(data || []);
        setFilteredReports(data || []);
      } catch (error: any) {
        console.error('Error fetching reports:', error);
        toast({
          title: 'Error',
          description: 'Failed to load reports',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user, toast]);

  // Filter reports based on search and status
  useEffect(() => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.preparer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    setFilteredReports(filtered);
  }, [reports, searchTerm, statusFilter]);

  const handleDownload = async (reportId: string, format: 'html' | 'markdown' | 'pdf' | 'word' | 'zip' | 'json') => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    
    try {
      setIsExporting(reportId);
      
      if (format === 'zip') {
        const zipBlob = await exportProjectToZip(reportId);
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${report.title.replace(/\s+/g, '_')}_export.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Open report in new tab with download parameter
        window.open(`/projects/${reportId}/report?download=${format}`, '_blank');
      }
      
      toast({
        title: 'Success',
        description: `${format.toUpperCase()} export initiated successfully`
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export project',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[#3F7D58]/10 text-[#3F7D58] border-[#3F7D58]/50';
      case 'draft': return 'bg-[#673F69]/10 text-[#673F69] border-[#673F69]/50';
      case 'review': return 'bg-[#7C4585]/10 text-[#7C4585] border-[#7C4585]/50';
      case 'archived': return 'bg-[#B51B75]/10 text-[#B51B75] border-[#B51B75]/50';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <MainLayout>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LibraryBig className="h-10 w-10" />
            Reports
          </h1>
          <p className="text-muted-foreground">View and manage all project reports</p>
        </div>
        {isAdmin && (
          <Button asChild className="w-full sm:w-auto">
            <Link to="/projects/new">
              <FileText className="mr-2 h-4 w-4" />
              Create New Report
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 max-w-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Preparer</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="font-medium">{report.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(report.start_date).toLocaleDateString()} - {new Date(report.end_date).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getStatusColor(report.status)}>
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{report.preparer}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(report.updated_at!).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/projects/${report.id}/report`}>
                          <FileText className="h-4 w-4 mr-1" />
                          View Report
                        </Link>
                      </Button>
                      <div className="relative">
                        <DownloadDropdown 
                          onDownload={(format) => handleDownload(report.id, format)}
                        />
                        {isExporting === report.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded">
                            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No reports found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'No reports match your current filters.' 
              : 'No reports have been created yet.'}
          </p>
          {isAdmin && !searchTerm && statusFilter === 'all' && (
            <Button asChild>
              <Link to="/projects/new">
                <FileText className="mr-2 h-4 w-4" />
                Create Your First Report
              </Link>
            </Button>
          )}
        </div>
      )}
    </MainLayout>
  );
};

export default Reports;