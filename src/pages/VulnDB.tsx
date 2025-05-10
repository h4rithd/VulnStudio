import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layouts/MainLayout';
import { supabase } from '@/lib/supabase';
import { VulnDB as VulnDBType } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, X, Eye, ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FormEvent } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const VulnDB = () => {
  const [vulnerabilities, setVulnerabilities] = useState<VulnDBType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentVuln, setCurrentVuln] = useState<VulnDBType | null>(null);
  const [newVulnerability, setNewVulnerability] = useState({
    title: '',
    background: '',
    details: '',
    remediation: '',
    ref_links: [] as string[]
  });

  // Focus restoration helper
  const restoreFocus = () => {
    // Small delay to ensure DOM has updated
    setTimeout(() => {
      document.body.tabIndex = -1;
      document.body.focus();
      document.body.removeAttribute('tabIndex');
    }, 10);
  };

  useEffect(() => {
    fetchVulnerabilities();
  }, []);

  const fetchVulnerabilities = async () => {
    try {
      console.log('[VulnDB] Fetching vulnerability templates from database');
      setLoading(true);
      const { data, error } = await supabase
        .from('vulndb')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[VulnDB] Error fetching vulnerabilities:', error);
        throw error;
      }

      console.log('[VulnDB] Successfully loaded', data?.length, 'templates');
      setVulnerabilities(data || []);
    } catch (error: any) {
      console.error('[VulnDB] Failed to fetch vulnerability templates:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch vulnerability templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVulnerability = async (id: string) => {
    console.log('[VulnDB] Attempting to delete vulnerability template:', id);
    
    if (!confirm('Are you sure you want to delete this template?')) {
      console.log('[VulnDB] Delete canceled by user');
      return;
    }

    try {
      console.log('[VulnDB] Deleting vulnerability template from database');
      const { error } = await supabase
        .from('vulndb')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[VulnDB] Error deleting vulnerability:', error);
        throw error;
      }

      // Update the UI
      console.log('[VulnDB] Template deleted successfully, updating UI');
      setVulnerabilities(vulnerabilities.filter(vuln => vuln.id !== id));
      toast({
        title: 'Success',
        description: 'Vulnerability template deleted successfully',
      });
    } catch (error: any) {
      console.error('[VulnDB] Failed to delete vulnerability template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete vulnerability template',
        variant: 'destructive',
      });
    }
  };

  const handleEditVulnerability = (vuln: VulnDBType) => {
    setCurrentVuln(vuln);
    setNewVulnerability({
      title: vuln.title,
      background: vuln.background,
      details: vuln.details,
      remediation: vuln.remediation,
      ref_links: Array.isArray(vuln.ref_links) ? vuln.ref_links.map(link => link.toString()) : []
    });
    setIsEditDialogOpen(true);
  };

  const handleAddRefLink = () => {
    const refLink = document.getElementById('ref_link') as HTMLInputElement;
    if (refLink.value.trim()) {
      console.log('[VulnDB] Adding ref link:', refLink.value);
      setNewVulnerability({
        ...newVulnerability,
        ref_links: [...newVulnerability.ref_links, refLink.value.trim()]
      });
      refLink.value = '';
    }
  };

  const handleRemoveRefLink = (index: number) => {
    console.log('[VulnDB] Removing ref link at index:', index);
    const updatedLinks = [...newVulnerability.ref_links];
    updatedLinks.splice(index, 1);
    setNewVulnerability({
      ...newVulnerability,
      ref_links: updatedLinks
    });
  };

  const handleAddVulnerability = async (e: FormEvent) => {
    e.preventDefault();
    console.log('[VulnDB] Adding new vulnerability template:', newVulnerability.title);
    
    if (!user) {
      console.error('[VulnDB] User not logged in');
      toast({
        title: 'Error',
        description: 'You must be logged in to add a vulnerability template',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Validate form
      if (!newVulnerability.title || !newVulnerability.background || 
          !newVulnerability.details || !newVulnerability.remediation) {
        console.error('[VulnDB] Form validation failed - missing required fields');
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }
      
      console.log('[VulnDB] Saving new template to database');
      const { data, error } = await supabase
        .from('vulndb')
        .insert({
          title: newVulnerability.title,
          background: newVulnerability.background,
          details: newVulnerability.details,
          remediation: newVulnerability.remediation,
          ref_links: newVulnerability.ref_links,
          created_by: user.id
        })
        .select();
      
      if (error) {
        console.error('[VulnDB] Error adding template:', error);
        throw error;
      }
      
      // Add the new vulnerability to the state
      if (data) {
        console.log('[VulnDB] Template added successfully, updating UI');
        setVulnerabilities([data[0], ...vulnerabilities]);
      }
      
      // Reset form and close dialog
      resetForm();
      setIsAddDialogOpen(false);
      
      toast({
        title: 'Success',
        description: 'Vulnerability template added successfully',
      });
    } catch (error: any) {
      console.error('[VulnDB] Failed to add vulnerability template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add vulnerability template',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateVulnerability = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!user || !currentVuln) {
      console.error('[VulnDB] Missing user or current vulnerability data');
      return;
    }
    
    console.log('[VulnDB] Updating vulnerability template:', currentVuln.id);
    
    try {
      // Validate form
      if (!newVulnerability.title || !newVulnerability.background || 
          !newVulnerability.details || !newVulnerability.remediation) {
        console.error('[VulnDB] Form validation failed - missing required fields');
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }
      
      console.log('[VulnDB] Sending update to database');
      const { error } = await supabase
        .from('vulndb')
        .update({
          title: newVulnerability.title,
          background: newVulnerability.background,
          details: newVulnerability.details,
          remediation: newVulnerability.remediation,
          ref_links: newVulnerability.ref_links
        })
        .eq('id', currentVuln.id);
      
      if (error) {
        console.error('[VulnDB] Error updating template:', error);
        throw error;
      }
      
      // Update the vulnerability in the state
      console.log('[VulnDB] Template updated successfully, updating UI');
      setVulnerabilities(vulnerabilities.map(vuln => 
        vuln.id === currentVuln.id 
          ? { 
              ...vuln, 
              title: newVulnerability.title,
              background: newVulnerability.background,
              details: newVulnerability.details,
              remediation: newVulnerability.remediation,
              ref_links: newVulnerability.ref_links
            } 
          : vuln
      ));
      
      // Reset form and close dialog
      resetForm();
      setIsEditDialogOpen(false);
      
      toast({
        title: 'Success',
        description: 'Vulnerability template updated successfully',
      });
    } catch (error: any) {
      console.error('[VulnDB] Failed to update vulnerability template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update vulnerability template',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    console.log('[VulnDB] Resetting form');
    setNewVulnerability({
      title: '',
      background: '',
      details: '',
      remediation: '',
      ref_links: []
    });
    setCurrentVuln(null);
  };

  const filteredVulnerabilities = vulnerabilities.filter(vuln =>
    vuln.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderVulnerabilityDialog = (isEdit: boolean) => {
    const dialogTitle = isEdit ? 'Edit Vulnerability Template' : 'Add New Vulnerability Template';
    const dialogAction = isEdit ? 'Update Template' : 'Add Template';
    const handleSubmit = isEdit ? handleUpdateVulnerability : handleAddVulnerability;
    
    return (
      <DialogContent className="sm:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update an existing vulnerability template.' : 'Create a new vulnerability template to use in your security reports.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Vulnerability Name</Label>
              <Input 
                id="title" 
                value={newVulnerability.title} 
                onChange={(e) => setNewVulnerability({...newVulnerability, title: e.target.value})}
                placeholder="SQL Injection"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="background">Issue Background</Label>
              <Textarea 
                id="background" 
                value={newVulnerability.background} 
                onChange={(e) => setNewVulnerability({...newVulnerability, background: e.target.value})}
                placeholder="Background information about this vulnerability"
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">Issue Detail</Label>
              <Textarea 
                id="details" 
                value={newVulnerability.details} 
                onChange={(e) => setNewVulnerability({...newVulnerability, details: e.target.value})}
                placeholder="Detailed explanation of the vulnerability"
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remediation">Remediation</Label>
              <Textarea 
                id="remediation" 
                value={newVulnerability.remediation} 
                onChange={(e) => setNewVulnerability({...newVulnerability, remediation: e.target.value})}
                placeholder="Steps to fix this vulnerability"
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ref_links">Related Links</Label>
              <div className="flex gap-2">
                <Input 
                  id="ref_link" 
                  placeholder="https://blog.h4rithd.com/reference"
                  className="flex-1"
                />
                <Button type="button" onClick={handleAddRefLink}>
                  Add
                </Button>
              </div>
              
              {newVulnerability.ref_links.length > 0 && (
                <ul className="space-y-2 mt-2">
                  {newVulnerability.ref_links.map((link, i) => (
                    <li key={i} className="flex items-center justify-between bg-muted p-2 rounded-md">
                      <span className="text-sm truncate mr-2">{link}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemoveRefLink(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => isEdit ? setIsEditDialogOpen(false) : setIsAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {dialogAction}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    );
  };

  const handleViewDetails = (vuln: VulnDBType) => {
    setCurrentVuln(vuln);
    setNewVulnerability({
      title: vuln.title,
      background: vuln.background,
      details: vuln.details,
      remediation: vuln.remediation,
      ref_links: Array.isArray(vuln.ref_links) ? vuln.ref_links.map(link => link.toString()) : []
    });
  };

  return (
    <MainLayout>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">VulnDB</h1>
          <p className="text-muted-foreground">Manage your vulnerability templates</p>
        </div>
        {isAdmin && (
          <Button onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Template
          </Button>
        )}
      </div>

      <div className="flex items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="flex justify-center mb-2">
              <Spinner size="lg" variant="secondary" />
            </div>
            <p className="text-muted-foreground">Loading vulnerability templates...</p>
          </div>
        ) : filteredVulnerabilities.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Vulnerability Name</TableHead>
                <TableHead className="w-[20%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVulnerabilities.map((vuln) => (
                <TableRow key={vuln.id} className="h-12">
                  <TableCell>
                    <div className="font-medium truncate">{vuln.title}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleViewDetails(vuln)}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleEditVulnerability(vuln)}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteVulnerability(vuln.id)}
                              className="cursor-pointer text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No vulnerability templates found</p>
          </div>
        )}
      </div>

      {/* Add Vulnerability Dialog */}
      <Dialog 
        open={isAddDialogOpen} 
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) restoreFocus();
        }}
      >
        {renderVulnerabilityDialog(false)}
      </Dialog>

      {/* Edit Vulnerability Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) restoreFocus();
        }}
      >
        {renderVulnerabilityDialog(true)}
      </Dialog>

      {/* View Vulnerability Dialog */}
      <Dialog 
        open={currentVuln !== null && !isEditDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setCurrentVuln(null);
            restoreFocus();
          }
        }}
      >
        <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
          {currentVuln && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>{currentVuln.title}</DialogTitle>
                  <div className="flex gap-2">
                    {isAdmin && (
                      <Button variant="outline" size="sm" onClick={() => {
                        setCurrentVuln(null);
                        handleEditVulnerability(currentVuln);
                      }}>
                        <Edit className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Issue Background</h3>
                  <div className="text-sm whitespace-pre-wrap">{currentVuln.background}</div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Issue Detail</h3>
                  <div className="text-sm whitespace-pre-wrap">{currentVuln.details}</div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Remediation</h3>
                  <div className="text-sm whitespace-pre-wrap">{currentVuln.remediation}</div>
                </div>
                
                {Array.isArray(currentVuln.ref_links) && currentVuln.ref_links.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Related Links</h3>
                    <ul className="list-disc pl-5">
                      {currentVuln.ref_links.map((link, i) => (
                        <li key={i} className="text-sm">
                          {String(link)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button onClick={() => setCurrentVuln(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default VulnDB;
