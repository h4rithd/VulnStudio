
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

// Form schemas for each step
const projectTypeSchema = z.object({
  storageType: z.enum(['permanent', 'temporary'])
});

const projectInfoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  assessment_type: z.enum(['initial', 'retest']).default('initial'),
  start_date: z.date(),
  end_date: z.date(),
  preparer: z.string().min(3, 'Preparer name is required'),
  preparer_email: z.string().email('Valid email is required'),
  reviewer: z.string().min(3, 'Reviewer name is required'),
  reviewer_email: z.string().email('Valid email is required'),
});

const scopeItemSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  value: z.string().min(1, 'Value is required'),
});

const projectScopeSchema = z.object({
  scope: z.array(scopeItemSchema).min(1, 'At least one scope item is required'),
  version: z.string().min(1, 'Version is required'),
  version_history: z.string().optional(),
});

// Combined schema for the final form data
const formSchema = projectTypeSchema.merge(projectInfoSchema).merge(projectScopeSchema);

type FormData = z.infer<typeof formSchema>;

interface ProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProjectWizard: React.FC<ProjectWizardProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Individual forms for each step
  const typeForm = useForm<z.infer<typeof projectTypeSchema>>({
    resolver: zodResolver(projectTypeSchema),
    defaultValues: {
      storageType: 'permanent'
    }
  });

  const infoForm = useForm<z.infer<typeof projectInfoSchema>>({
    resolver: zodResolver(projectInfoSchema),
    defaultValues: {
      title: '',
      assessment_type: 'initial',
      start_date: new Date(),
      end_date: new Date(new Date().setDate(new Date().getDate() + 14)),
      preparer: '',
      preparer_email: '',
      reviewer: '',
      reviewer_email: '',
    }
  });

  const scopeForm = useForm<z.infer<typeof projectScopeSchema>>({
    resolver: zodResolver(projectScopeSchema),
    defaultValues: {
      scope: [{ type: 'Domain', value: '' }],
      version: '1.0',
      version_history: '',
    }
  });

  // Handle next step
  const handleNext = async () => {
    switch (step) {
      case 0:
        const typeValid = await typeForm.trigger();
        if (typeValid) setStep(1);
        break;
      case 1:
        const infoValid = await infoForm.trigger();
        if (infoValid) setStep(2);
        break;
      default:
        break;
    }
  };

  // Handle back step
  const handleBack = () => {
    setStep(Math.max(0, step - 1));
  };

  // Add scope item
  const addScopeItem = () => {
    const scope = scopeForm.getValues('scope');
    scopeForm.setValue('scope', [...scope, { type: 'Domain', value: '' }]);
  };

  // Remove scope item
  const removeScopeItem = (index: number) => {
    const scope = scopeForm.getValues('scope');
    if (scope.length > 1) {
      scopeForm.setValue('scope', scope.filter((_, i) => i !== index));
    } else {
      toast({
        title: 'Error',
        description: 'At least one scope item is required',
        variant: 'destructive',
      });
    }
  };

  // Save to localStorage for temporary projects
  const saveToLocalStorage = (data: FormData) => {
    try {
      // Format the data for storage
      const projectData = {
        ...data,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'draft',
        start_date: data.start_date.toISOString(),
        end_date: data.end_date.toISOString(),
        created_by: user?.id || 'anonymous',
        preparer_email: data.preparer_email,
        reviewer_email: data.reviewer_email,
        vulnerabilities: [] // Initialize with empty vulnerabilities array
      };
      
      console.log('Saving temporary project to localStorage:', projectData);
      
      // Get existing projects or initialize empty array
      const existingProjects = JSON.parse(localStorage.getItem('temporaryProjects') || '[]');
      
      // Add new project
      existingProjects.push(projectData);
      
      // Save back to localStorage
      localStorage.setItem('temporaryProjects', JSON.stringify(existingProjects));
      
      // Show success message
      setSuccess(true);
      toast({
        title: 'Success',
        description: 'Temporary project created successfully',
      });
      
      // After 2 seconds, close dialog and navigate to projects
      setTimeout(() => {
        onClose();
        navigate('/projects');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error saving to localStorage:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save temporary project',
        variant: 'destructive',
      });
    }
  };

  // Save to database for permanent projects
  const saveToDatabase = async (data: FormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Format the title based on assessment type
      const formattedTitle = data.assessment_type === 'retest'
        ? `Re-test: ${data.title}`
        : data.title;

      // Add the project to Supabase
      const { data: project, error } = await supabase
        .from('reports')
        .insert({
          title: formattedTitle,
          start_date: data.start_date.toISOString(),
          end_date: data.end_date.toISOString(),
          preparer: data.preparer,
          preparer_email: data.preparer_email,
          reviewer: data.reviewer,
          reviewer_email: data.reviewer_email,
          version: data.version,
          version_history: data.version_history || '',
          scope: data.scope,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Show success message
      setSuccess(true);
      
      // After 2 seconds, close dialog and navigate to new project
      setTimeout(() => {
        onClose();
        navigate(`/projects/${project.id}`);
      }, 2000);
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create project',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle final submission
  const handleSubmit = async () => {
    const scopeValid = await scopeForm.trigger();
    if (!scopeValid) return;
    
    // Combine all form data
    const combinedData: FormData = {
      ...typeForm.getValues(),
      ...infoForm.getValues(),
      ...scopeForm.getValues(),
    };
    
    console.log('Form submission with data:', combinedData);
    
    // Save based on storage type
    if (combinedData.storageType === 'temporary') {
      saveToLocalStorage(combinedData);
    } else {
      await saveToDatabase(combinedData);
    }
  };

  // If success screen is shown
  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              Project Created Successfully
            </h2>
            <p className="text-muted-foreground mb-6">
              {typeForm.getValues().storageType === 'temporary' 
                ? "Your project has been saved locally. Remember to export when finished."
                : "Your project has been saved to the database."}
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 0 && "Project Type"}
            {step === 1 && "Project Information"}
            {step === 2 && "Project Scope"}
          </DialogTitle>
          <DialogDescription>
            {step === 0 && "Choose how you want to store this project."}
            {step === 1 && "Enter the basic information about your project."}
            {step === 2 && "Define the scope and version information for your project."}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <div className="w-full bg-gray-200 h-2 rounded-full">
            <div 
              className="bg-secondary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / 3) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Project Type</span>
            <span>Project Info</span>
            <span>Project Scope</span>
          </div>
        </div>

        {/* Step 1: Project Type */}
        {step === 0 && (
          <Form {...typeForm}>
            <form className="space-y-6">
              <FormField
                control={typeForm.control}
                name="storageType"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div 
                        className={`border p-6 rounded-lg cursor-pointer transition-colors ${
                          field.value === 'permanent' ? 'border-secondary bg-secondary/10' : 'border-gray-200'
                        }`}
                        onClick={() => typeForm.setValue('storageType', 'permanent')}
                      >
                        <h3 className="font-medium mb-2">Permanent Project</h3>
                        <p className="text-sm text-muted-foreground">
                          Project will be stored in the database and accessible across devices.
                        </p>
                      </div>
                      <div 
                        className={`border p-6 rounded-lg cursor-pointer transition-colors ${
                          field.value === 'temporary' ? 'border-secondary bg-secondary/10' : 'border-gray-200'
                        }`}
                        onClick={() => typeForm.setValue('storageType', 'temporary')}
                      >
                        <h3 className="font-medium mb-2">Temporary Project</h3>
                        <p className="text-sm text-muted-foreground">
                          Project will be stored locally in your browser and will be lost when browser data is cleared.
                        </p>
                        <div className="flex items-center mt-3 text-amber-600 text-sm">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          <span>Remember to export your project when finished.</span>
                        </div>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}

        {/* Step 2: Project Information */}
        {step === 1 && (
          <Form {...infoForm}>
            <form className="space-y-6">
              <FormField
                control={infoForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Web Application Security Assessment" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter a descriptive name for your project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={infoForm.control}
                name="assessment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assessment Type</FormLabel>
                    <div className="flex flex-col space-y-2">
                      <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Re-test Assessment</FormLabel>
                          <FormDescription>
                            Toggle for re-test assessment to verify remediation of previous findings
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value === 'retest'}
                            onCheckedChange={(checked) => 
                              infoForm.setValue('assessment_type', checked ? 'retest' : 'initial')
                            }
                          />
                        </FormControl>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={infoForm.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={infoForm.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <FormField
                    control={infoForm.control}
                    name="preparer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preparer</FormLabel>
                        <FormControl>
                          <Input placeholder="Name of the person preparing the report" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={infoForm.control}
                    name="preparer_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preparer Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Email of the preparer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-6">
                  <FormField
                    control={infoForm.control}
                    name="reviewer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reviewer</FormLabel>
                        <FormControl>
                          <Input placeholder="Name of the person reviewing the report" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={infoForm.control}
                    name="reviewer_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reviewer Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Email of the reviewer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        )}

        {/* Step 3: Project Scope */}
        {step === 2 && (
          <Form {...scopeForm}>
            <form className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <FormLabel>Project Scope</FormLabel>
                </div>
                <div className="space-y-4">
                  {scopeForm.watch('scope').map((_, index) => (
                    <div key={index} className="flex items-center gap-6">
                      <FormField
                        control={scopeForm.control}
                        name={`scope.${index}.type`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="Type (e.g., domain, IP, application)"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={scopeForm.control}
                        name={`scope.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-[2]">
                            <FormControl>
                              <Input
                                placeholder="Define the scope of your security assessment (domains, IPs, applications)"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeScopeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addScopeItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={scopeForm.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1.0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Current version of the report
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={scopeForm.control}
                  name="version_history"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version History</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g. v1.0 - Initial assessment"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Track changes between versions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        )}

        <DialogFooter className="flex justify-between mt-6">
          <div>
            {step > 0 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div>
            {step < 2 && (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            )}
            {step === 2 && (
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectWizard;
