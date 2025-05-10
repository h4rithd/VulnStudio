
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Folder, Database, Settings, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: <BarChart2 size={20} />,
    },
    {
      name: 'Projects',
      path: '/projects',
      icon: <Folder size={20} />,
    },
    {
      name: 'VulnDB',
      path: '/vulndb',
      icon: <Database size={20} />,
    },
  ];

  // Admin only menu items
  if (isAdmin) {
    menuItems.push({
      name: 'Settings',
      path: '/settings',
      icon: <Settings size={20} />,
    });
  }

  return (
    <aside 
      className={cn(
        'h-[calc(100vh-4rem)] border-r transition-all duration-300 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 py-6">
          <nav className="px-2 space-y-1">
            {menuItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  'flex items-center py-2 px-3 text-sm font-medium rounded-md transition-all',
                  location.pathname === item.path || location.pathname.startsWith(`${item.path}/`) 
                    ? 'bg-accent text-accent-foreground' 
                    : 'hover:bg-muted/50'
                )}
              >
                <div className="mr-3">{item.icon}</div>
                {!collapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full flex justify-center"
            onClick={toggleCollapse}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
