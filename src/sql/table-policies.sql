
-- First, ensure Row Level Security is enabled for all tables
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulndb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON public.reports;

DROP POLICY IF EXISTS "Users can view vulnerabilities" ON public.vulnerabilities;
DROP POLICY IF EXISTS "Users can insert vulnerabilities" ON public.vulnerabilities;
DROP POLICY IF EXISTS "Users can update vulnerabilities" ON public.vulnerabilities;
DROP POLICY IF EXISTS "Users can delete vulnerabilities" ON public.vulnerabilities;

DROP POLICY IF EXISTS "Users can view vulnDB entries" ON public.vulndb;
DROP POLICY IF EXISTS "Users can insert vulnDB entries" ON public.vulndb;
DROP POLICY IF EXISTS "Users can update vulnDB entries" ON public.vulndb;
DROP POLICY IF EXISTS "Users can delete vulnDB entries" ON public.vulndb;

DROP POLICY IF EXISTS "Users can view users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

DROP POLICY IF EXISTS "Users can view attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can insert attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can update their own attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.attachments;

-- =================== REPORTS POLICIES ===================
-- Allow users to view all reports
CREATE POLICY "Users can view reports" 
ON public.reports 
FOR SELECT 
USING (true);

-- Allow users to insert their own reports
CREATE POLICY "Users can insert their own reports" 
ON public.reports 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own reports
CREATE POLICY "Users can update their own reports" 
ON public.reports 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Allow users to delete their own reports
CREATE POLICY "Users can delete their own reports" 
ON public.reports 
FOR DELETE 
USING (auth.uid() = created_by);

-- =================== VULNERABILITIES POLICIES ===================
-- Allow users to view all vulnerabilities
CREATE POLICY "Users can view vulnerabilities" 
ON public.vulnerabilities 
FOR SELECT 
USING (true);

-- Allow users to insert vulnerabilities
CREATE POLICY "Users can insert vulnerabilities" 
ON public.vulnerabilities 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own vulnerabilities
CREATE POLICY "Users can update their own vulnerabilities" 
ON public.vulnerabilities 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Allow users to delete their own vulnerabilities
CREATE POLICY "Users can delete their own vulnerabilities" 
ON public.vulnerabilities 
FOR DELETE 
USING (auth.uid() = created_by);

-- =================== VULNDB POLICIES ===================
-- Allow users to view all vulnDB entries
CREATE POLICY "Users can view vulnDB entries" 
ON public.vulndb 
FOR SELECT 
USING (true);

-- Allow users to insert vulnDB entries
CREATE POLICY "Users can insert vulnDB entries" 
ON public.vulndb 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own vulnDB entries
CREATE POLICY "Users can update their own vulnDB entries" 
ON public.vulndb 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Allow users to delete their own vulnDB entries
CREATE POLICY "Users can delete their own vulnDB entries" 
ON public.vulndb 
FOR DELETE 
USING (auth.uid() = created_by);

-- =================== USERS POLICIES ===================
-- Allow users to view other users' basic info
CREATE POLICY "Users can view all users" 
ON public.users 
FOR SELECT 
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

-- =================== ATTACHMENTS POLICIES ===================
-- Allow users to view all attachments
CREATE POLICY "Users can view all attachments" 
ON public.attachments 
FOR SELECT 
USING (true);

-- Allow users to insert their own attachments
CREATE POLICY "Users can insert their own attachments" 
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
