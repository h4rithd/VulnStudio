
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { DynamicInputList, Item } from '@/components/ui/dynamic-input-list';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Check, Calendar, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define the form schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  start_date: z.date({ required_error: 'Start date is required' }),
  end_date: z.date({ required_error: 'End date is required' }),
  preparer: z.string().min(1, 'Preparer name is required'),
  preparer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  reviewer: z.string().min(1, 'Reviewer name is required'),
  reviewer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  scope: z.array(z.object({ value: z.string() })).optional(),
  version: z.string().optional(),
  isTemporary: z.boolean().optional(),
  projectType: z.enum(['permanent', 'temporary']).default('permanent'),
});

type FormValues = z.infer<typeof formSchema>;

// Helper function to format date to YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

interface ProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectWizard = ({ isOpen, onClose }: ProjectWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      start_date: new Date(),
      end_date: new Date(),
      preparer: '',
      preparer_email: '',
      reviewer: '',
      reviewer_email: '',
      scope: [{ value: '' }],
      version: '1.0',
      isTemporary: false,
      projectType: 'permanent',
    },
  });

  // Watch project type selection
  const projectType = form.watch('projectType');
  
  // Define the steps - now with project type as the first step
  const steps = [
    {
      title: 'Project Type',
      description: 'Choose whether to create a cloud or temporary project',
      fields: ['projectType'],
    },
    {
      title: 'Basic Information',
      description: 'Enter the basic details of your project',
      fields: ['title', 'start_date', 'end_date'],
    },
    {
      title: 'Team Information',
      description: 'Enter information about the project team',
      fields: ['preparer', 'preparer_email', 'reviewer', 'reviewer_email'],
    },
    {
      title: 'Project Scope',
      description: 'Define the scope of your project',
      fields: ['scope', 'version'],
    },
  ];

  // Function to validate the current step
  const validateStep = async (step: number): Promise<boolean> => {
  const currentStepFields = steps[step].fields;

  // Validate all fields in the current step
  const isValid = await form.trigger(currentStepFields as (keyof FormValues)[]);

  return isValid;
};


  // Function to go to the next step
  const handleNext = async () => {
  const isValid = await validateStep(currentStep);
  if (isValid && currentStep < steps.length - 1) {
    setCurrentStep(currentStep + 1);
  }
};


  // Function to go to the previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Add a function to save temporary project to localStorage
  const saveTempProject = (projectData: any) => {
    try {
      // Generate unique ID for temporary project
      const tempId = 'temp_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
      
      // Create project object with temp ID
      const tempProject = {
        ...projectData,
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'draft',
        created_by: user?.id || 'local',
      };
      
      // Get existing temp projects
      const existingTempProjects = localStorage.getItem('tempProjects');
      const tempProjects = existingTempProjects ? JSON.parse(existingTempProjects) : [];
      
      // Add new temp project
      tempProjects.push(tempProject);
      
      // Save back to localStorage
      localStorage.setItem('tempProjects', JSON.stringify(tempProjects));
      
      // Initialize an empty array for vulnerabilities for this project
      localStorage.setItem(`tempVulnerabilities_${tempId}`, JSON.stringify([]));
      
      return tempId;
    } catch (error) {
      console.error('Failed to save temporary project:', error);
      throw error;
    }
  };

  // Function to handle form submission
  const handleFinish = async () => {
    // Validate final step
     const isValid = await validateStep(currentStep);
  if (!isValid) return;

  setLoading(true);
    
    try {
      const formData = form.getValues();
      
      // Prepare project data
      const projectData = {
        title: formData.title,
        start_date: formatDate(formData.start_date),
        end_date: formatDate(formData.end_date),
        preparer: formData.preparer,
        preparer_email: formData.preparer_email || '',
        reviewer: formData.reviewer,
        reviewer_email: formData.reviewer_email || '',
        scope: formData.scope || [],
        version: formData.version || '1.0',
      };

      // If creating a temporary project
      if (formData.projectType === 'temporary') {
        const tempId = saveTempProject(projectData);
        
        // Show success message
        toast({
          title: 'Success',
          description: 'Temporary project created successfully',
        });
        
        // Navigate to the project details page
        navigate(`/projects/${tempId}`);
        return;
      }

      // Otherwise proceed with regular project creation
      const { data, error } = await supabase
        .from('reports')
        .insert([{
          ...projectData,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Project created successfully',
      });

      // Navigate to the project details
      navigate(`/projects/${data.id}`);
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create project',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStep
                    ? 'bg-primary/80 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentStep ? <Check className="h-5 w-5" /> : index + 1}
              </div>
              <div className="text-sm mt-2 text-center">{step.title}</div>
            </div>
          ))}
        </div>
        <div className="relative mt-2">
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
            <div
              className="h-1 bg-primary transition-all"
              style={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form>
            <CardContent className="space-y-4">
              {/* Step 0: Project Type */}
              {currentStep === 0 && (
                <>
                  <FormField
                    control={form.control}
                    name="projectType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Choose Project Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="permanent" />
                              </FormControl>
                              <div className="space-y-1">
                                <FormLabel className="font-medium">
                                  Cloud Project
                                </FormLabel>
                                <FormDescription>
                                  Store your project in the cloud for team collaboration and access from anywhere.
                                </FormDescription>
                              </div>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="temporary" />
                              </FormControl>
                              <div className="space-y-1">
                                <FormLabel className="font-medium">
                                  Temporary Project
                                </FormLabel>
                                <FormDescription>
                                  Store your project locally in your browser. Your data stays on your device.
                                </FormDescription>
                              </div>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Warning for temporary projects */}
                  {form.watch('projectType') === 'temporary' && (
                    <Alert variant="warning" className="bg-amber-50 text-amber-800 border-amber-200 mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Warning</AlertTitle>
                      <AlertDescription>
                        Temporary projects are stored only in your browser. They may be deleted if you clear your browser data or log out. 
                        Remember to export your project when completed to save your work.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter project title" {...field} required/>
                        </FormControl>
                        <FormDescription>
                          The title of your security assessment project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Step 2: Team Information */}
              {currentStep === 2 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="preparer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preparer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter preparer name" {...field} required />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="preparer_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preparer Email (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter preparer email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="reviewer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reviewer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter reviewer name" {...field} required/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reviewer_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reviewer Email (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter reviewer email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Step 3: Project Scope */}
              {currentStep === 3 && (
                <>
                  <FormField
                    control={form.control}
                    name="scope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Scope</FormLabel>
                        <FormControl>
                          <DynamicInputList
                            items={field.value || [{ value: '' }]}
                            onChange={(items: Item[]) => field.onChange(items)}
                            placeholder="Enter scope item"
                            required
                          />
                        </FormControl>
                        <FormDescription>
                          Define the scope of your security assessment (e.g., URLs, IP ranges, applications)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Version</FormLabel>
                        <FormControl>
                          <Input placeholder="1.0" {...field} />
                        </FormControl>
                        <FormDescription>
                          Version number for this report
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleFinish}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Project <Check className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default ProjectWizard;