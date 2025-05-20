
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Reports } from '@/types/database.types';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent 
} from '@/components/ui/chart';

interface DashboardStats {
  totalProjects: number;
  completedProjects: number;
  draftProjects: number;
  tempProjects: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  vulnDbCount: number;
  monthlyActivity: {
    name: string;
    value: number;
  }[];
}

interface RecentProject extends Reports {
  vulnerabilities_count?: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  is_retest?: boolean;
  isTemporary?: boolean;
}

const COLORS = ['#c161a1', '#ee6c6e', '#ea9c6b', '#a0c878', '#7acbd5'];
const PROJECT_STATUS_COLORS = ['#9cca77', '#7acbd5', '#ea9c6b', '#999999'];

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    completedProjects: 0,
    draftProjects: 0,
    tempProjects: 0,
    vulnerabilities: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    },
    vulnDbCount: 0,
    monthlyActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get temporary projects from localStorage
        const tempProjectsJSON = localStorage.getItem('tempProjects');
        const tempProjects = tempProjectsJSON ? JSON.parse(tempProjectsJSON) : [];
        
        // Fetch recent cloud projects
        const { data: cloudProjects, error: projectsError } = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (projectsError) throw projectsError;

        // Combine cloud and temporary projects
        let allProjects = [...(cloudProjects || [])];
        
        // Limit temp projects to 5 most recent
        const recentTempProjects = tempProjects
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        
        // Add isTemporary flag to temp projects
        const formattedTempProjects = recentTempProjects.map((project: any) => ({
          ...project,
          isTemporary: true
        }));
        
        allProjects = [...allProjects, ...formattedTempProjects];
        
        // Sort combined projects by creation date
        allProjects.sort((a, b) => 
          new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
        );
        
        // Limit to 5 total
        allProjects = allProjects.slice(0, 5);
        
        // Get vulnerabilities for each project
        const projectsWithVulns = await Promise.all(allProjects.map(async (project) => {
          let vulnCounts = {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            info: 0,
          };
          
          // For temporary projects
          if (project.isTemporary) {
            const tempVulnsKey = `tempVulnerabilities_${project.id}`;
            const tempVulnsJSON = localStorage.getItem(tempVulnsKey);
            const tempVulns = tempVulnsJSON ? JSON.parse(tempVulnsJSON) : [];
            
            vulnCounts = {
              total: tempVulns.length,
              critical: tempVulns.filter((v: any) => v.severity === 'critical').length,
              high: tempVulns.filter((v: any) => v.severity === 'high').length,
              medium: tempVulns.filter((v: any) => v.severity === 'medium').length,
              low: tempVulns.filter((v: any) => v.severity === 'low').length,
              info: tempVulns.filter((v: any) => v.severity === 'info').length,
            };
          }
          // For cloud projects
          else {
            const { data: vulnData, error: vulnError } = await supabase
              .from('vulnerabilities')
              .select('severity')
              .eq('report_id', project.id);
            
            if (!vulnError && vulnData) {
              vulnCounts = {
                total: vulnData.length,
                critical: vulnData.filter(v => v.severity === 'critical').length,
                high: vulnData.filter(v => v.severity === 'high').length,
                medium: vulnData.filter(v => v.severity === 'medium').length,
                low: vulnData.filter(v => v.severity === 'low').length,
                info: vulnData.filter(v => v.severity === 'info').length,
              };
            }
          }
          
          // Check if this is a retest project
          const isRetest = project.title.startsWith('Re-test:');
          
          return {
            ...project,
            vulnerabilities_count: vulnCounts,
            is_retest: isRetest
          };
        }));
        
        setRecentProjects(projectsWithVulns);

        // Fetch total projects count
        const { count: totalCount, error: totalError } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true });
        
        if (totalError) throw totalError;

        // Fetch completed projects count
        const { count: completedCount, error: completedError } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');
        
        if (completedError) throw completedError;
        
        // Fetch draft projects count
        const { count: draftCount, error: draftError } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft');
          
        if (draftError) throw draftError;
        
        // Count temp projects from localStorage
        const tempProjectCount = tempProjects.length;
        
        // Fetch vulnerability counts by severity
        const { data: vulnData, error: vulnError } = await supabase
          .from('vulnerabilities')
          .select('severity');
        
        if (vulnError) throw vulnError;

        const vulnerabilityCounts = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        };

        if (vulnData) {
          vulnData.forEach(vuln => {
            if (vulnerabilityCounts[vuln.severity as keyof typeof vulnerabilityCounts] !== undefined) {
              vulnerabilityCounts[vuln.severity as keyof typeof vulnerabilityCounts]++;
            }
          });
        }
        
        // Get VulnDB template count
        const { count: vulnDbCount, error: vulnDbError } = await supabase
          .from('vulndb')
          .select('*', { count: 'exact', head: true });
          
        if (vulnDbError) throw vulnDbError;

        // Generate monthly activity data
        const monthlyActivity = generateMonthlyActivity(cloudProjects || []);
        
        setStats({
          totalProjects: (totalCount || 0) + tempProjectCount,
          completedProjects: completedCount || 0,
          draftProjects: draftCount || 0,
          tempProjects: tempProjectCount,
          vulnerabilities: vulnerabilityCounts,
          vulnDbCount: vulnDbCount || 0,
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
  
  const projectStatusData = [
    { name: 'Completed', value: stats.completedProjects },
    { name: 'Draft', value: stats.draftProjects },
    { name: 'Temporary', value: stats.tempProjects },
  ];

  // Helper function to render vulnerability badges
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

  return (
    <MainLayout>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProjects}</div>
                <p className="text-xs text-muted-foreground mt-1">Projects created</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedProjects}</div>
                <p className="text-xs text-muted-foreground mt-1">Projects completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.vulnDbCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Vulnerability templates available</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Critical Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.vulnerabilities.critical}</div>
                <p className="text-xs text-muted-foreground mt-1">Critical vulnerabilities found</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Vulnerability Severity Breakdown</CardTitle>
                <CardDescription>Distribution of vulnerabilities by severity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ChartContainer config={{ 
                    critical: { theme: { light: '#c161a1', dark: '#c161a1' } },
                    high: { theme: { light: '#ee6c6e', dark: '#ee6c6e' } },
                    medium: { theme: { light: '#ea9c6b', dark: '#ea9c6b' } },
                    low: { theme: { light: '#a0c878', dark: '#a0c878' } },
                    info: { theme: { light: '#7acbd5', dark: '#7acbd5' } }
                  }}>
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
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                    </PieChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Project Status Breakdown</CardTitle>
                <CardDescription>Distribution of projects by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ChartContainer config={{ 
                    completed: { theme: { light: '#9cca77', dark: '#9cca77' } },
                    draft: { theme: { light: '#7acbd5', dark: '#7acbd5' } },
                    temporary: { theme: { light: '#ea9c6b', dark: '#ea9c6b' } }
                  }}>
                    <PieChart>
                      <Pie
                        data={projectStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {projectStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PROJECT_STATUS_COLORS[index % PROJECT_STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                    </PieChart>
                  </ChartContainer>
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
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{project.title}</h3>
                            {project.is_retest && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Re-test
                              </span>
                            )}
                            {project.isTemporary && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                Temporary
                              </span>
                            )}
                          </div>
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
