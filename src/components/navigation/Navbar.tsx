import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Bell, User, Settings2, LogOut, UserCircle, Shield, Activity, Database } from 'lucide-react';
import { ThemeToggle } from '../ui-custom/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import ProjectSearch from './ProjectSearch';
import { settingsApi } from '@/utils/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DatabaseStatusResponse {
  status: string;
  success: boolean;
  timestamp: string;
  error?: string;
}

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut, user, isAdmin, session } = useAuth();
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    timestamp?: string;
    error?: string;
  } | null>(null);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const checkDatabaseStatus = async () => {
    try {
      const result = await settingsApi.getDatabaseStatus() as DatabaseStatusResponse;
      if (result.success) {
        setDbStatus({
          connected: result.status === 'connected',
          timestamp: result.timestamp,
          error: result.error
        });
      }
    } catch (error) {
      setDbStatus({
        connected: false,
        error: 'Failed to check database status'
      });
    }
  };

  useEffect(() => {
    // Only check database status if user is authenticated
    if (session) {
      checkDatabaseStatus();
      // Check every 15 minutes (900000 ms)
      const interval = setInterval(checkDatabaseStatus, 15 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [session]);

  return (
    <TooltipProvider>
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Brand */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground leading-none">
                   
                      <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
                        {isAdmin ? 'Admin' : 'Read-Only Access'}
                      </Badge>
                         {!isAdmin && (
                        <Badge variant="outline" className="mt-1 text-xs bg-amber-100 text-amber-800 border-amber-200">
                          Read-Only Access
                        </Badge>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center - Enhanced Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <ProjectSearch className="w-full" />
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              {/* Desktop actions */}
              <div className="hidden md:flex items-center gap-2">
                <ThemeToggle />

                {/* Database Status Indicator - only show if authenticated */}
                {session && dbStatus && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent transition-colors cursor-pointer">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <div className={`w-2 h-2 rounded-full ${dbStatus.connected
                          ? 'bg-green-500 animate-pulse'
                          : 'bg-red-500'
                          }`}></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">
                        Database: {dbStatus.connected ? 'Connected' : 'Disconnected'}
                        {dbStatus.error && (
                          <span className="block text-xs text-muted-foreground">
                            {dbStatus.error}
                          </span>
                        )}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Enhanced User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-3 hover:bg-accent transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {user?.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden lg:flex flex-col items-start min-w-0">
                        <span className="text-sm font-medium truncate max-w-32">
                          {user?.email?.split('@')[0] || 'User'}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                            {user?.email?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user?.email?.split('@')[0] || 'User'}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer flex items-center gap-2">
                        <UserCircle className="mx-3 h-4 w-4" />
                        Profile Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer flex items-center gap-2">
                        <Activity className="mx-3 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="cursor-pointer flex items-center gap-2">
                          <Settings2 className="mx-3 h-4 w-4" />
                          System Settings
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()} className="text-red-600 cursor-pointer flex items-center gap-2">
                      <LogOut className="mx-3 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur">
            <div className="p-4 space-y-4">
              {/* Mobile search */}
              <ProjectSearch className="w-full" />

              {/* Mobile user info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {user?.email?.split('@')[0] || 'User'}
                  </span>
                  <div className="flex items-center gap-1">
                    {isAdmin && <Shield className="h-3 w-3 text-orange-500" />}
                    <span className="text-xs text-muted-foreground">
                      {isAdmin ? 'Administrator' : 'Auditor'}
                    </span>
                  </div>
                </div>
                {/* Mobile database status */}
                {session && dbStatus && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <div className={`w-2 h-2 rounded-full ${dbStatus.connected
                      ? 'bg-green-500'
                      : 'bg-red-500'
                      }`}></div>
                  </div>
                )}
              </div>

              {/* Mobile navigation links */}
              <div className="space-y-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserCircle className="h-4 w-4" />
                  Profile
                </Link>
                {isAdmin && (
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings2 className="h-4 w-4" />
                    Settings
                  </Link>
                )}
              </div>

              {/* Mobile actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center">
                      3
                    </Badge>
                  </Button>
                </div>
                <Button variant="outline" onClick={() => signOut()} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </TooltipProvider>
  );
};

export default Navbar;
