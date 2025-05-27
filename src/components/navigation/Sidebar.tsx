
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
import { AppWindow, Package2, Settings, LayoutDashboard, Shield, LibraryBig, Users, Plus, Search as SearchIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const AppSidebar = () => {
  const location = useLocation();
  const { isAdmin, user } = useAuth();
  const { state } = useSidebar();

  const mainMenuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      description: 'Overview and analytics',
      badge: null
    },
    {
      name: 'Projects',
      path: '/projects',
      icon: AppWindow,
      description: 'Manage your projects',
      badge: null
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: LibraryBig,
      description: 'View all reports',
      badge: null
    },
    {
      name: 'VulnDB',
      path: '/vulndb',
      icon: Package2,
      description: 'Vulnerability database',
      badge: null
    },
  ];

  const adminMenuItems = [
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      description: 'System configuration',
      badge: null
    }
  ];

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <Sidebar collapsible="icon" className="">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          {state === "expanded" && (
            <div className="flex flex-col">
              <img src="/images/logo.png" alt="VulnStudio" className="h-8 w-auto"/>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => {
                const isActive = isActiveRoute(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={state === "collapsed" ? item.name : undefined}
                      className={`
                        relative transition-all duration-200 hover:scale-[1.02]
                        ${isActive ? 'bg-primary/10 text-primary shadow-sm' : ''}
                      `}
                    >
                      <Link to={item.path} className="flex items-center gap-3 w-full">
                        <item.icon className={`h-4 w-4 ${isActive ? 'text-primary animate-pulse' : ''}`} />
                        <span className={isActive ? 'font-medium' : ''}>{item.name}</span>
                        {item.badge && state === "expanded" && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {item.badge}
                          </Badge>
                        )}
                        {isActive && (
                          <div className="absolute left-0 top-0 h-full w-1 bg-primary rounded-r-full animate-fade-in"></div>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
                  {adminMenuItems.map((item) => {
                    const isActive = isActiveRoute(item.path);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={state === "collapsed" ? item.name : undefined}
                          className={`
                            relative transition-all duration-200 hover:scale-[1.02]
                            ${isActive ? 'bg-primary/10 text-primary shadow-sm' : ''}
                          `}
                        >
                          <Link to={item.path} className="flex items-center gap-3 w-full">
                            <item.icon className={`h-4 w-4 ${isActive ? 'text-primary animate-pulse' : ''}`} />
                            <span className={isActive ? 'font-medium' : ''}>{item.name}</span>
                            {isActive && (
                              <div className="absolute left-0 top-0 h-full w-1 bg-primary rounded-r-full animate-fade-in"></div>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
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
                    <SidebarMenuButton asChild className="hover:scale-[1.02] transition-all duration-200">
                      <Link to="/projects/new" className="flex items-center gap-3">
                        <Plus className="h-4 w-4" />
                        <span>New Project</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="">
        <div className="p-1">
          <SidebarTrigger className="w-full hover:scale-[1.02] transition-all duration-200" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;