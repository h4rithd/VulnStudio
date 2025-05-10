-- Create users table
CREATE TABLE public.users (
    id uuid PRIMARY KEY,
    email text NOT NULL,
    name text,
    username text,
    role text
);

-- Create reports table
CREATE TABLE public.reports (
    id uuid PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    title text,
    start_date date,
    end_date date,
    preparer text,
    reviewer text,
    scope text,
    status text,
    version text,
    created_by uuid REFERENCES public.users(id),
    version_history jsonb
);

-- Create vulnerabilities table
CREATE TABLE public.vulnerabilities (
    id uuid PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    report_id uuid REFERENCES public.reports(id),
    title text,
    severity text,
    cvss_score numeric,
    cvss_vector text,
    affected_versions text,
    background text,
    details text,
    remediation text,
    ref_links jsonb,
    request_response jsonb,
    created_by uuid REFERENCES public.users(id),
    poc_images jsonb,
    vulnerability_id text,
    display_order integer,
    current_status text,
    retest_date date,
    retest_result text,
    retest_images jsonb
);

-- Create attachments table
CREATE TABLE public.attachments (
    id uuid PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    vulnerability_id uuid REFERENCES public.vulnerabilities(id),
    name text,
    content_type text,
    data bytea,
    created_by uuid REFERENCES public.users(id),
    label text
);

-- Create vulndb table
CREATE TABLE public.vulndb (
    id uuid PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    title text,
    background text,
    details text,
    remediation text,
    ref_links jsonb,
    created_by uuid REFERENCES public.users(id)
);

-- Create vulndb_backup table
CREATE TABLE public.vulndb_backup (
    id uuid PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    title text,
    background text,
    details text,
    remediation text,
    ref_links jsonb,
    created_by uuid REFERENCES public.users(id),
    category text
);

