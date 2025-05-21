import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Reports } from '@/types/database.types';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useToast } from '@/hooks/use-toast';

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
  const [recentProjects, setRecentProjects] = useState<Reports[]>([]);
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
        const { data: projects, error: projectsError } = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (projectsError) throw projectsError;
        
        if (projects) {
          setRecentProjects(projects);
        }

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

        // Generate monthly activity data
        const monthlyActivity = generateMonthlyActivity(projects || []);
        
        setStats({
          totalProjects: totalCount || 0,
          completedProjects: completedCount || 0,
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
                <CardTitle className="text-sm font-medium">Critical Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.vulnerabilities.critical}</div>
                <p className="text-xs text-muted-foreground mt-1">Critical vulnerabilities found</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">High Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.vulnerabilities.high}</div>
                <p className="text-xs text-muted-foreground mt-1">High vulnerabilities found</p>
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
            
            <Card>
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
                      <Bar dataKey="value" fill="#A0C878" />
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
