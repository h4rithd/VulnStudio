
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import MainLayout from '@/components/layouts/MainLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

const scopeItemSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  value: z.string().min(1, 'Value is required'),
});

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  start_date: z.date(),
  end_date: z.date(),
  preparer: z.string().min(3, 'Preparer name is required'),
  reviewer: z.string().min(3, 'Reviewer name is required'),
  version: z.string().min(1, 'Version is required'),
  version_history: z.string().optional(),
  scope: z.array(scopeItemSchema).min(1, 'At least one scope item is required'),
  assessment_type: z.enum(['initial', 'retest']).default('initial'),
});

type FormData = z.infer<typeof formSchema>;

const NewProject = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      start_date: new Date(),
      end_date: new Date(new Date().setDate(new Date().getDate() + 14)), // 2 weeks from now
      preparer: '',
      reviewer: '',
      version: '1.0',
      version_history: '',
      scope: [{ type: 'Domain', value: '' }],
      assessment_type: 'initial',
    },
  });

  const onSubmit = async (data: FormData) => {
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
          reviewer: data.reviewer,
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

      toast({
        title: 'Success',
        description: 'Project created successfully',
      });

      navigate(`/projects/${project.id}`);
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

  const addScopeItem = () => {
    const scope = form.getValues('scope');
    form.setValue('scope', [...scope, { type: 'Domain', value: '' }]);
  };

  const removeScopeItem = (index: number) => {
    const scope = form.getValues('scope');
    if (scope.length > 1) {
      form.setValue('scope', scope.filter((_, i) => i !== index));
    } else {
      toast({
        title: 'Error',
        description: 'At least one scope item is required',
        variant: 'destructive',
      });
    }
  };

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
        <p className="text-muted-foreground">Start a new security testing project</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 ">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="assessment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assessment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="initial">Initial Assessment</SelectItem>
                          <SelectItem value="retest">Re-test</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {field.value === 'retest' ?
                          'Re-test assessment to verify remediation of previous findings' :
                          'Initial security assessment'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  control={form.control}
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
              <div className=''>
                <div className="flex items-center justify-between mb-4">
                  <FormLabel>Project Scope</FormLabel>
                </div>
                <div className="space-y-4">
                  {form.watch('scope').map((_, index) => (
                    <div key={index} className="flex items-center gap-6">
                      <FormField
                        control={form.control}
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
                        control={form.control}
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
                  control={form.control}
                  name="preparer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preparer</FormLabel>
                      <FormControl>
                        <Input placeholder="Name of the person preparing the report" {...field} />
                      </FormControl>
                      <FormDescription>
                        The main security tester/author
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reviewer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reviewer</FormLabel>
                      <FormControl>
                        <Input placeholder="Name of the person reviewing the report" {...field} />
                      </FormControl>
                      <FormDescription>
                        The person who will review the findings
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
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
                  control={form.control}
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



              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/projects')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default NewProject;
