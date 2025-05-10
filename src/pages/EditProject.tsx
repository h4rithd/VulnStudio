
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronLeft, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Reports } from '@/types/database.types';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ProjectFormData {
  title: string;
  preparer: string;
  reviewer: string;
  version: string;
  version_history: string;
  start_date: string;
  end_date: string;
  domain: string;
  isRetest: boolean;
}

const EditProject = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>();
  
  const title = watch('title', '');
  
  useEffect(() => {
    const fetchProject = async () => {
      try {
        if (!projectId) return;

        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('id', projectId)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setValue('title', data.title);
          setValue('preparer', data.preparer);
          setValue('reviewer', data.reviewer);
          setValue('version', data.version);
          
          // Handle version_history (which might be null for older records)
          setValue('version_history', data.version_history || '');
          
          // Handle dates
          if (data.start_date) {
            setStartDate(new Date(data.start_date));
            setValue('start_date', data.start_date);
          }
          
          if (data.end_date) {
            setEndDate(new Date(data.end_date));
            setValue('end_date', data.end_date);
          }
          
          // Handle scope data
          if (data.scope && Array.isArray(data.scope)) {
            const domain = data.scope.find((item: any) => item.type === 'domain')?.value || '';
            setValue('domain', domain);
          }
          
          // Determine if this is a retest project by checking title prefix
          setValue('isRetest', data.title.startsWith('Re-test:'));
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load project',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, setValue, toast]);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setSubmitting(true);
      
      // Format dates to ISO strings
      const formattedStartDate = startDate ? format(startDate, 'yyyy-MM-dd') : '';
      const formattedEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : '';
      
      // Update title if retest status changed
      let updatedTitle = data.title;
      const isCurrentlyRetest = title.startsWith('Re-test:');
      
      if (data.isRetest && !isCurrentlyRetest) {
        updatedTitle = `Re-test: ${title.replace(/^Re-test:\s*/, '')}`;
      } else if (!data.isRetest && isCurrentlyRetest) {
        updatedTitle = title.replace(/^Re-test:\s*/, '');
      }
      
      // Prepare scope array
      const scope = [
        { type: 'domain', value: data.domain },
      ];

      const { error } = await supabase
        .from('reports')
        .update({
          title: updatedTitle,
          preparer: data.preparer,
          reviewer: data.reviewer,
          version: data.version,
          version_history: data.version_history || '',  // Ensure we never send null
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          scope,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });

      // Navigate back to project details
      navigate(`/projects/${projectId}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update project',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin h-10 w-10 border-4 border-secondary border-t-transparent rounded-full"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex items-center gap-2 mb-8">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Project</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  {...register('title', { required: 'Title is required' })}
                  placeholder="Security Assessment of Example Company"
                  className="mt-1"
                />
                {errors.title && (
                  <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label>Project Type</Label>
                <RadioGroup 
                  defaultValue={watch('isRetest') ? 'retest' : 'initial'} 
                  className="flex space-x-4 mt-1"
                  onValueChange={(value) => setValue('isRetest', value === 'retest')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="initial" id="initial" />
                    <Label htmlFor="initial">Initial Assessment</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="retest" id="retest" />
                    <Label htmlFor="retest">Re-test</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal mt-1"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date);
                          if (date) {
                            setValue('start_date', format(date, 'yyyy-MM-dd'));
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal mt-1"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date);
                          if (date) {
                            setValue('end_date', format(date, 'yyyy-MM-dd'));
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="domain">Domain/Scope</Label>
                <Input
                  id="domain"
                  {...register('domain')}
                  placeholder="example.com"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="preparer">Prepared By</Label>
                  <Input
                    id="preparer"
                    {...register('preparer', { required: 'Preparer is required' })}
                    placeholder="Security Analyst"
                    className="mt-1"
                  />
                  {errors.preparer && (
                    <p className="text-sm text-destructive mt-1">{errors.preparer.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="reviewer">Reviewed By</Label>
                  <Input
                    id="reviewer"
                    {...register('reviewer', { required: 'Reviewer is required' })}
                    placeholder="Security Lead"
                    className="mt-1"
                  />
                  {errors.reviewer && (
                    <p className="text-sm text-destructive mt-1">{errors.reviewer.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    {...register('version', { required: 'Version is required' })}
                    placeholder="1.0"
                    className="mt-1"
                  />
                  {errors.version && (
                    <p className="text-sm text-destructive mt-1">{errors.version.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="version_history">Version History</Label>
                <Textarea
                  id="version_history"
                  {...register('version_history')}
                  placeholder="v1.0 - Initial release&#10;v1.1 - Updated findings"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </MainLayout>
  );
};

export default EditProject;
