
-- Create attachments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vulnerability_id UUID NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  data TEXT NOT NULL,
  content_type TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add Row Level Security policies
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Allow users to view attachments for vulnerabilities they have access to
CREATE POLICY "Users can view attachments"
  ON public.attachments 
  FOR SELECT
  USING (true);

-- Allow users to insert their own attachments
CREATE POLICY "Users can insert attachments"
  ON public.attachments 
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own attachments
CREATE POLICY "Users can update their own attachments"
  ON public.attachments 
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own attachments"
  ON public.attachments 
  FOR DELETE
  USING (auth.uid() = created_by);
