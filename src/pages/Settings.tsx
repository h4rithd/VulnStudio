import { useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
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
import { DownloadCloud, UploadCloud, AlertTriangle } from 'lucide-react';

const Settings = () => {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importData, setImportData] = useState<File | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const handleExportDatabase = async () => {
    try {
      setExportLoading(true);
      
      // Fetch data from all tables
      const [usersRes, reportsRes, vulnRes, vulnDBRes, attachmentsRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('reports').select('*'),
        supabase.from('vulnerabilities').select('*'),
        supabase.from('vulnDB').select('*'),
        supabase.from('attachments').select('*'),
      ]);
      
      // Prepare export data
      const exportData = {
        users: usersRes.data,
        reports: reportsRes.data,
        vulnerabilities: vulnRes.data,
        vulnDB: vulnDBRes.data,
        attachments: attachmentsRes.data,
        exportDate: new Date().toISOString(),
        exportedBy: user?.id,
      };
      
      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `vulnstudio-export-${new Date().toISOString()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
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
      const importedData = JSON.parse(fileContent);
      
      // Validate the imported data structure
      const requiredTables = ['users', 'reports', 'vulnerabilities', 'vulnDB'];
      for (const table of requiredTables) {
        if (!importedData[table] || !Array.isArray(importedData[table])) {
          throw new Error(`Invalid import file: ${table} data is missing or invalid`);
        }
      }

      // 1. Handle conflicts (upsert)
      // 2. Maintain referential integrity
      // 3. Add more validation
      const results = await Promise.all([
        // For each table, we'll clear it first to avoid duplicates
        // Note: Real implementations would handle this more gracefully
        supabase.from('vulnDB').upsert(importedData.vulnDB.map((item: any) => ({
          ...item,
          created_at: new Date(item.created_at).toISOString(),
          updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null
        }))),
        supabase.from('reports').upsert(importedData.reports.map((item: any) => ({
          ...item,
          created_at: new Date(item.created_at).toISOString(),
          updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null
        }))),
        supabase.from('vulnerabilities').upsert(importedData.vulnerabilities.map((item: any) => ({
          ...item,
          created_at: new Date(item.created_at).toISOString(),
          updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null
        }))),
        supabase.from('users').upsert(importedData.users.map((item: any) => ({
          ...item,
          created_at: new Date(item.created_at).toISOString()
        }))),
      ]);
      
      // Check for errors
      const errors = results.filter(r => r.error).map(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Import errors: ${errors.map(e => e?.message).join(', ')}`);
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
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure application settings</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="export">Export/Import</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>
                Configure general application settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="UTC">
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="GMT">GMT</SelectItem>
                    <SelectItem value="EST">Eastern Time (EST)</SelectItem>
                    <SelectItem value="CST">Central Time (CST)</SelectItem>
                    <SelectItem value="PST">Pacific Time (PST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Admin User</TableCell>
                    <TableCell>admin@vulnstudio.com</TableCell>
                    <TableCell>Admin</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Auditor User</TableCell>
                    <TableCell>auditor@vulnstudio.com</TableCell>
                    <TableCell>Auditor</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              
              <div className="mt-4 flex justify-end">
                <Button>Add User</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Templates</CardTitle>
              <CardDescription>
                Configure report templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="template">Default Template</Label>
                <Select defaultValue="default">
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Template</SelectItem>
                    <SelectItem value="minimal">Minimal Template</SelectItem>
                    <SelectItem value="detailed">Detailed Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="upload-template">Upload New Template</Label>
                <div className="flex gap-3 mt-1.5">
                  <Input id="upload-template" type="file" />
                  <Button>Upload</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export and Import</CardTitle>
              <CardDescription>
                Export database for backup or import from an existing file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Export Database</h3>
                <p className="text-sm text-muted-foreground">
                  Download a JSON file with all your data for backup or transfer purposes
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={handleExportDatabase} 
                    disabled={exportLoading}
                    className="mt-2"
                  >
                    {exportLoading ? (
                      <>Exporting...</>
                    ) : (
                      <>
                        <DownloadCloud className="mr-2 h-4 w-4" />
                        Export Database
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <h3 className="text-lg font-medium">Import Data</h3>
                <p className="text-sm text-muted-foreground">
                  Import data from a previous export
                </p>
                <div className="flex gap-3 mt-1.5">
                  <Input type="file" accept=".json" onChange={handleImportFile} />
                  <Button 
                    variant="outline" 
                    onClick={() => setIsImportDialogOpen(true)}
                    disabled={!importData}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />
                  Warning: This will merge with or replace existing data
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Database Import</AlertDialogTitle>
            <AlertDialogDescription>
              This action will merge the imported data with your existing database. 
              This operation cannot be undone. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImportDatabase}
              disabled={importLoading}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {importLoading ? 'Importing...' : 'Yes, Import Data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Settings;
