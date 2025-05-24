
-- First, drop the existing policy that depends on the role column
DROP POLICY IF EXISTS "Admins can update" ON public.users;

-- Create user roles table to manage user permissions
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'auditor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create RLS policies for user_roles table
CREATE POLICY "Admins can manage all user roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- First migrate existing roles to the new system
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.users 
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Now that we've migrated the roles, we can drop the column
ALTER TABLE public.users DROP COLUMN IF EXISTS role CASCADE;

-- Add first_login column to users table if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT false;

-- Create function to automatically assign admin role to first user
CREATE OR REPLACE FUNCTION public.assign_initial_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If this is the first user in the system, make them an admin
  IF (SELECT COUNT(*) FROM public.users) = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Otherwise, assign auditor role by default
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'auditor')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to assign default role when user is created
DROP TRIGGER IF EXISTS assign_default_role_trigger ON public.users;
CREATE TRIGGER assign_default_role_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_initial_admin_role();

-- Add RLS policies for existing tables to respect new role system
DROP POLICY IF EXISTS "Admin full access to reports" ON public.reports;
CREATE POLICY "Admin full access to reports"
  ON public.reports
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Auditor read access to reports" ON public.reports;
CREATE POLICY "Auditor read access to reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'auditor'));

-- Enable RLS on reports table if not already enabled
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Similar policies for vulnerabilities table
DROP POLICY IF EXISTS "Admin full access to vulnerabilities" ON public.vulnerabilities;
CREATE POLICY "Admin full access to vulnerabilities"
  ON public.vulnerabilities
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Auditor read access to vulnerabilities" ON public.vulnerabilities;
CREATE POLICY "Auditor read access to vulnerabilities"
  ON public.vulnerabilities
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'auditor'));

-- Enable RLS on vulnerabilities table if not already enabled
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;

-- Similar policies for vulndb table
DROP POLICY IF EXISTS "Admin full access to vulndb" ON public.vulndb;
CREATE POLICY "Admin full access to vulndb"
  ON public.vulndb
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Auditor read access to vulndb" ON public.vulndb;
CREATE POLICY "Auditor read access to vulndb"
  ON public.vulndb
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'auditor'));

-- Enable RLS on vulndb table if not already enabled
ALTER TABLE public.vulndb ENABLE ROW LEVEL SECURITY;

-- Create new policy for users table
CREATE POLICY "Admins can update users" 
  ON public.users
  FOR ALL 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
