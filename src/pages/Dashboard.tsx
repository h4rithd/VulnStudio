import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileEdit, RotateCcw, Clock, CheckCircle, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Reports } from '@/types/database.types';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { reportsApi, vulnerabilitiesApi } from '@/utils/api';

interface RecentProject extends Reports {
  id: string | number; // Add this line if Reports does not already include 'id'
  title: string; // Add this line to fix the error
  created_at?: string | Date; // Add this line to fix the error
  vulnerabilities_count?: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

interface DashboardStats {
  totalProjects: number;
  completedProjects: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  monthlyActivity: {
    name: string;
    value: number;
  }[];
}

const COLORS = ['#c161a1', '#ee6c6e', '#ea9c6b', '#a0c878', '#7acbd5'];

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    completedProjects: 0,
    vulnerabilities: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    },
    monthlyActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [pendingDrafts, setPendingDrafts] = useState(0);
  const [retestProjects, setRetestProjects] = useState(0);
  const { toast } = useToast();

  const renderVulnerabilityCounts = (project: RecentProject) => {
    if (!project.vulnerabilities_count) return null;

    const counts = project.vulnerabilities_count;
    return (
      <div className="flex flex-wrap items-center gap-1 mt-1">
        {counts.critical > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-severity-critical text-white">
            {counts.critical} Critical
          </span>
        )}
        {counts.high > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-severity-high text-white">
            {counts.high} High
          </span>
        )}
        {counts.medium > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-severity-medium text-white">
            {counts.medium} Medium
          </span>
        )}
        {counts.low > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-severity-low text-white">
            {counts.low} Low
          </span>
        )}
        {counts.info > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-severity-info text-white">
            {counts.info} Info
          </span>
        )}
        {counts.total === 0 && (
          <span className="text-muted-foreground text-xs">No vulnerabilities</span>
        )}
      </div>
    );
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch recent projects
        const projectsResult = await reportsApi.getAll();
        
        if (!projectsResult.success) {
          throw new Error(projectsResult.error || 'Failed to fetch projects');
        }
        
        // Get the 5 most recent projects
        const recentProjectsData = projectsResult.data?.slice(0, 5) || [];
        setRecentProjects(recentProjectsData);

        // Get project counts
        const totalProjects = projectsResult.data?.length || 0;
        const completedProjects = projectsResult.data?.filter(p => p.status === 'completed').length || 0;
        const draftProjects = projectsResult.data?.filter(p => p.status === 'draft').length || 0;
        const inProgressProjects = projectsResult.data?.filter(p => p.status === 'review').length || 0;
        
        setPendingDrafts(draftProjects);
        setRetestProjects(inProgressProjects);
        
        // Calculate vulnerability counts
        const vulnerabilityCounts = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        };
        
        // Sum up all vulnerabilities from all projects
        projectsResult.data?.forEach(project => {
          if (project.vulnerabilities_count) {
            vulnerabilityCounts.critical += project.vulnerabilities_count.critical;
            vulnerabilityCounts.high += project.vulnerabilities_count.high;
            vulnerabilityCounts.medium += project.vulnerabilities_count.medium;
            vulnerabilityCounts.low += project.vulnerabilities_count.low;
            vulnerabilityCounts.info += project.vulnerabilities_count.info;
          }
        });

        // Generate monthly activity data
        const monthlyActivity = generateMonthlyActivity(projectsResult.data || []);
        
        setStats({
          totalProjects,
          completedProjects,
          vulnerabilities: vulnerabilityCounts,
          monthlyActivity,
        });
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, toast]);

  // Helper function to generate monthly activity from projects
  const generateMonthlyActivity = (projects: Reports[]) => {
    const months: Record<string, number> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize all months with zero
    monthNames.forEach(month => {
      months[month] = 0;
    });
    
    // Count projects by month
    projects.forEach(project => {
      const date = new Date(project.created_at || Date.now());
      const month = monthNames[date.getMonth()];
      months[month]++;
    });
    
    // Convert to array format for chart
    return Object.keys(months).map(month => ({
      name: month,
      value: months[month]
    }));
  };

  const vulnerabilityData = [
    { name: 'Critical', value: stats.vulnerabilities.critical },
    { name: 'High', value: stats.vulnerabilities.high },
    { name: 'Medium', value: stats.vulnerabilities.medium },
    { name: 'Low', value: stats.vulnerabilities.low },
    { name: 'Info', value: stats.vulnerabilities.info },
  ];

  return (
    <MainLayout>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-10 w-10" />
            Dashboard
            </h1>
          <p className="text-muted-foreground">Overview of your security testing projects</p>
        </div>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Start New Project
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/projects">View Projects</Link>
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="vulnstudio-card h-32"></div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-[#23486A]/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className="p-2 bg-[#23486A]/20 rounded-lg">
                    <FileEdit className="h-4 w-4 text-[#23486A] animate-pulse" />
                  </div>
                  Total Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold animate-fade-in">{stats.totalProjects}</div>
                <p className="text-xs text-muted-foreground mt-1">Projects created</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-[#3F7D58]/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className="p-2 bg-[#3F7D58]/20 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-[#3F7D58] animate-pulse" />
                  </div>
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold animate-fade-in">{stats.completedProjects}</div>
                <p className="text-xs text-muted-foreground mt-1">Projects completed</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-[#F4631E]/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className="p-2 bg-[#F4631E]/20 rounded-lg">
                    <Clock className="h-4 w-4 text-[#F4631E] animate-pulse" />
                  </div>
                  Pending in Draft
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold animate-fade-in">{pendingDrafts}</div>
                <p className="text-xs text-muted-foreground mt-1">Projects in draft status</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-[#7C4585]/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className="p-2 bg-[#7C4585]/20 rounded-lg">
                    <RotateCcw className="h-4 w-4 text-[#7C4585] animate-pulse" />
                  </div>
                  Re-test
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold animate-fade-in">{retestProjects}</div>
                <p className="text-xs text-muted-foreground mt-1">Projects requiring re-testing</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <Card className="hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <CardHeader>
                <CardTitle>Vulnerability Severity Breakdown</CardTitle>
                <CardDescription>Distribution of vulnerabilities by severity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={vulnerabilityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {vulnerabilityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <CardHeader>
                <CardTitle>Monthly Activity</CardTitle>
                <CardDescription>Projects completed by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.monthlyActivity}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3E5879" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
                <CardDescription>Your most recently created projects</CardDescription>
              </CardHeader>
              <CardContent>
                {recentProjects.length > 0 ? (
                  <div className="space-y-4">
                    {recentProjects.map((project) => (
                      <div key={project.id} className="flex justify-between items-center border-b pb-3">
                        <div>
                          <h3 className="font-medium">{project.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(project.created_at!).toLocaleDateString()}
                          </p>
                          {renderVulnerabilityCounts(project)}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/projects/${project.id}`}>View</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No recent projects found</p>
                    {isAdmin && (
                      <Button asChild variant="link" className="mt-2">
                        <Link to="/projects/new">Create your first project</Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </MainLayout>
  );
};

export default Dashboard;