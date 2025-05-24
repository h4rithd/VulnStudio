
import { Link, useLocation } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import { Folder, Database, Settings, BarChart2, Shield, FileText, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const AppSidebar = () => {
  const location = useLocation();
  const { isAdmin, user } = useAuth();
  const { state } = useSidebar();

  const mainMenuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: BarChart2,
      description: 'Overview and analytics'
    },
    {
      name: 'Projects',
      path: '/projects',
      icon: Folder,
      description: 'Manage your projects'
    },
    {
      name: 'VulnDB',
      path: '/vulndb',
      icon: Database,
      description: 'Vulnerability database'
    },
  ];

  const adminMenuItems = [
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      description: 'System configuration'
    },
    {
      name: 'Users',
      path: '/users',
      icon: Users,
      description: 'User management'
    },
  ];

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
  
          {state === "expanded" && (
            <div className="flex flex-col">
              <img src="/images/logo.png" alt="VulnStudio"/>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActiveRoute(item.path)}
                    tooltip={state === "collapsed" ? item.name : undefined}
                  >
                    <Link to={item.path}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <Separator/>
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminMenuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActiveRoute(item.path)}
                        tooltip={state === "collapsed" ? item.name : undefined}
                      >
                        <Link to={item.path}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {state === "expanded" && (
          <>
            <Separator/>
            <SidebarGroup>
              <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to="/projects/new">
                        <Folder className="h-4 w-4" />
                        <span>New Project</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to="/vulndb">
                        <Shield className="h-4 w-4" />
                        <span>Search Vulnerabilities</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="p-2">
          <SidebarTrigger className="w-full" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
