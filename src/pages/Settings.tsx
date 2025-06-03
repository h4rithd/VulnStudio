import { useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DownloadCloud, UploadCloud, AlertTriangle, UserPlus, Shield, FileText, Settings as SettingsIcon, Database, Globe, SlidersVertical } from 'lucide-react';
import { AddUserDialog } from '@/components/user-management/AddUserDialog';
import { EditUserDialog } from '@/components/user-management/EditUserDialog';
import { UserActionsDropdown } from '@/components/user-management/UserActionsDropdown';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { usersApi } from '@/utils/api';
import { DatabaseConnectionForm } from '@/components/settings/DatabaseConnectionForm';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const Settings = () => {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importData, setImportData] = useState<File | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const { users, loading: usersLoading, refreshUsers, deleteUser, updateUserRole } = useUserManagement();

  const handleExportDatabase = async () => {
    try {
      setExportLoading(true);
      
      // Use the API to export the database
      const result = await usersApi.exportDatabase();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to export database');
      }
      
      // Create and download JSON file
      const blob = result.data as Blob;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vulnstudio-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'Database exported successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export database',
        variant: 'destructive',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/json') {
      toast({
        title: 'Invalid File Format',
        description: 'Please select a JSON file',
        variant: 'destructive',
      });
      return;
    }
    
    setImportData(file);
  };

  const handleImportDatabase = async () => {
    if (!importData) {
      toast({
        title: 'No File Selected',
        description: 'Please select a JSON file to import',
        variant: 'destructive',
      });
      return;
    }

    try {
      setImportLoading(true);
      
      // Read the JSON file
      const fileContent = await importData.text();
      
      // Use the API to import the database
      const result = await usersApi.importDatabase(fileContent);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to import database');
      }
      
      toast({
        title: 'Success',
        description: 'Database imported successfully',
      });
      setIsImportDialogOpen(false);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Error',
        description: error.message || 'Failed to import database',
        variant: 'destructive',
      });
    } finally {
      setImportLoading(false);
      setImportData(null);
    }
  };

  const handleEditUser = (userData: User) => {
    setSelectedUser(userData);
    setIsEditUserDialogOpen(true);
  };

  const handleUserAdded = () => {
    refreshUsers();
  };

  const handleUserUpdated = () => {
    refreshUsers();
    setSelectedUser(null);
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                Only administrators can access the settings page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SlidersVertical className="h-10 w-10" />
            Settings
            </h1>
        <p className="text-muted-foreground">Configure application settings and manage users</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
          <TabsTrigger value="integration" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Integration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage all registered users and their permissions ({users.length} total users)
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddUserDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-muted-foreground">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">No users found</p>
                  <p className="text-sm text-muted-foreground">
                    Users who sign up will appear here automatically
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userData) => (
                      <TableRow key={userData.id}>
                        <TableCell className="font-medium">{userData.name}</TableCell>
                        <TableCell>{userData.email}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            userData.role === 'admin' 
                              ? 'bg-[#5459AC]/10 text-[#5459AC]' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {userData.role === 'admin' ? 'Admin' : 'Auditor'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#C95792]/10 text-[#C95792]">
                            Active
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(userData.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <UserActionsDropdown
                            user={userData}
                            onEdit={handleEditUser}
                            onDelete={deleteUser}
                            onRoleChange={updateUserRole}
                            currentUserId={user?.id}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">
                    Auto-logout after inactivity
                  </p>
                </div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">15 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="allowed-domains">Allowed Email Domains</Label>
                <Textarea 
                  id="allowed-domains"
                  placeholder="@company.com&#10;@h4rithd.com"
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  One domain per line. Leave empty to allow all domains.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Generation Settings</CardTitle>
              <CardDescription>
                Configure default settings for vulnerability reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="report-footer">Default Report Footer</Label>
                <Textarea 
                  id="report-footer"
                  placeholder="Confidential - For internal use only"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CVSS Settings</CardTitle>
              <CardDescription>
                Configure CVSS scoring defaults
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cvss-version">CVSS Version</Label>
                <Select defaultValue="3.1">
                  <SelectTrigger id="cvss-version">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3.1">CVSS 3.1</SelectItem>
                    <SelectItem value="3.0">CVSS 3.0</SelectItem>
                    <SelectItem value="2.0">CVSS 2.0</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-calculate Environmental Score</Label>
                  <p className="text-sm text-muted-foreground">
                    Include environmental metrics in scoring
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Export and import vulnerability data (user passwords are excluded from exports)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Export Database</h4>
                  <p className="text-sm text-muted-foreground">
                    Download all vulnerability data as JSON (excluding user passwords)
                  </p>
                  <Button 
                    onClick={handleExportDatabase} 
                    disabled={exportLoading}
                    className="w-full"
                  >
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    {exportLoading ? 'Exporting...' : 'Export Data'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Import Database</h4>
                  <p className="text-sm text-muted-foreground">
                    Upload vulnerability data from JSON file
                  </p>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                    />
                    <Button
                      onClick={() => setIsImportDialogOpen(true)}
                      disabled={!importData || importLoading}
                      className="w-full"
                      variant="outline"
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Import Data
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Data Import Warning</p>
                    <p className="text-sm text-muted-foreground">
                      Importing data will merge with existing records. Make sure to backup your data before importing.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <DatabaseConnectionForm />
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <AddUserDialog
        isOpen={isAddUserDialogOpen}
        onClose={() => setIsAddUserDialogOpen(false)}
        onUserAdded={handleUserAdded}
      />

      {/* Edit User Dialog */}
      {selectedUser && (
        <EditUserDialog
          open={isEditUserDialogOpen}
          onOpenChange={(open) => {
            setIsEditUserDialogOpen(open);
            if (!open) setSelectedUser(null);
          }}
          onUserUpdated={handleUserUpdated}
          user={selectedUser}
        />
      )}

      {/* Import Confirmation Dialog */}
      <AlertDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Database Import</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to import the selected file? This will merge the data with your existing database.
              {importData && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <strong>File:</strong> {importData.name}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportDatabase} disabled={importLoading}>
              {importLoading ? 'Importing...' : 'Import'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Settings;
