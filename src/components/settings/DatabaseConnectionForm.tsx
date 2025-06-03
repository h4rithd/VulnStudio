
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { settingsApi } from '@/utils/api';
import { Database, TestTube2, Save } from 'lucide-react';

interface DatabaseSettings {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
}

export const DatabaseConnectionForm = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<DatabaseSettings>({
    host: '',
    port: '',
    database: '',
    user: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      setLoading(true);
      const result = await settingsApi.getDatabaseSettings();
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load database settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof DatabaseSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      const result = await settingsApi.testDatabaseConnection(settings);
      
      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: 'Database connection test passed',
        });
      } else {
        throw new Error(result.error || 'Connection test failed');
      }
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect to database',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const result = await settingsApi.updateDatabaseSettings(settings);
      
      if (result.success) {
        toast({
          title: 'Settings Saved',
          description: 'Database connection settings updated successfully',
        });
        // Reload page to apply new connection
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(result.error || 'Failed to save settings');
      }
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save database settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Connection
          </CardTitle>
          <CardDescription>Loading database settings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Connection
        </CardTitle>
        <CardDescription>
          Configure your database connection settings. Changes will require a server restart.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="host">Database Host</Label>
            <Input
              id="host"
              value={settings.host}
              onChange={(e) => handleInputChange('host', e.target.value)}
              placeholder="localhost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              value={settings.port}
              onChange={(e) => handleInputChange('port', e.target.value)}
              placeholder="5432"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="database">Database Name</Label>
          <Input
            id="database"
            value={settings.database}
            onChange={(e) => handleInputChange('database', e.target.value)}
            placeholder="vulnstudiodb"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user">Database User</Label>
          <Input
            id="user"
            value={settings.user}
            onChange={(e) => handleInputChange('user', e.target.value)}
            placeholder="username"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Database Password</Label>
          <Input
            id="password"
            type="password"
            value={settings.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Enter new password or leave as **** to keep current"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={testConnection}
            disabled={testing || saving}
            variant="outline"
            className="flex-1"
          >
            <TestTube2 className="mr-2 h-4 w-4" />
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button
            onClick={saveSettings}
            disabled={testing || saving}
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
