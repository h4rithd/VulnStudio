import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Bell, User, Settings2, LogOut, UserCircle, Shield, Activity } from 'lucide-react';
import { ThemeToggle } from '../ui-custom/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import ProjectSearch from './ProjectSearch';
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

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut, user, isAdmin } = useAuth();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Brand */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground leading-none">Security Platform</span>
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
              
              {/* Enhanced Notifications Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center animate-pulse">
                      3
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="font-medium">New vulnerability detected</div>
                    </div>
                    <div className="text-sm text-muted-foreground">Critical severity issue found in Project Alpha</div>
                    <div className="text-xs text-muted-foreground">2 minutes ago</div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      <div className="font-medium">Scan completed</div>
                    </div>
                    <div className="text-sm text-muted-foreground">Project Beta security scan finished</div>
                    <div className="text-xs text-muted-foreground">1 hour ago</div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <div className="font-medium">Report generated</div>
                    </div>
                    <div className="text-sm text-muted-foreground">Monthly security report is ready</div>
                    <div className="text-xs text-muted-foreground">3 hours ago</div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
                      <div className="flex items-center gap-1">
                        {isAdmin && <Shield className="h-3 w-3 text-orange-500" />}
                        <span className="text-xs text-muted-foreground">
                          {isAdmin ? 'Administrator' : 'Auditor'}
                        </span>
                      </div>
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
                        <div className="flex items-center gap-1">
                          {isAdmin && <Shield className="h-3 w-3 text-orange-500" />}
                          <span className="text-xs text-muted-foreground">
                            {isAdmin ? 'Administrator' : 'Auditor'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer flex items-center gap-2">
                      <UserCircle className="mr-2 h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer flex items-center gap-2">
                      <Activity className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer flex items-center gap-2">
                        <Settings2 className="mr-2 h-4 w-4" />
                        System Settings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-red-600 cursor-pointer flex items-center gap-2">
                    <LogOut className="mr-2 h-4 w-4" />
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
  );
};

export default Navbar;