--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: assign_initial_admin_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_initial_admin_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: has_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    vulnerability_id uuid NOT NULL,
    name text NOT NULL,
    content_type text NOT NULL,
    data text NOT NULL,
    created_by uuid NOT NULL,
    label text DEFAULT ''::text NOT NULL
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    title text NOT NULL,
    start_date text NOT NULL,
    end_date text NOT NULL,
    preparer text NOT NULL,
    reviewer text NOT NULL,
    scope jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text,
    version text DEFAULT '1.0'::text,
    created_by uuid NOT NULL,
    version_history text DEFAULT ''::text,
    preparer_email text DEFAULT ''::text,
    reviewer_email text DEFAULT ''::text,
    is_retest boolean DEFAULT false NOT NULL,
    CONSTRAINT reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'review'::text, 'completed'::text, 'archived'::text])))
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role text NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vulndb; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vulndb (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    title text NOT NULL,
    background text NOT NULL,
    details text NOT NULL,
    remediation text NOT NULL,
    ref_links jsonb DEFAULT '[]'::jsonb,
    created_by uuid NOT NULL
);


--
-- Name: vulnerabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vulnerabilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    report_id uuid NOT NULL,
    title text NOT NULL,
    severity text NOT NULL,
    cvss_score numeric NOT NULL,
    cvss_vector text NOT NULL,
    affected_versions jsonb DEFAULT '[]'::jsonb,
    background text NOT NULL,
    details text NOT NULL,
    remediation text NOT NULL,
    ref_links jsonb DEFAULT '[]'::jsonb,
    request_response jsonb DEFAULT '{}'::jsonb,
    created_by uuid NOT NULL,
    poc_images jsonb DEFAULT '[]'::jsonb,
    vulnerability_id text,
    display_order integer DEFAULT 0,
    current_status boolean DEFAULT false,
    retest_date timestamp with time zone,
    retest_result text,
    retest_images jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT vulnerabilities_severity_check CHECK ((severity = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text, 'info'::text])))
);


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attachments (id, created_at, vulnerability_id, name, content_type, data, created_by, label) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reports (id, created_at, updated_at, title, start_date, end_date, preparer, reviewer, scope, status, version, created_by, version_history, preparer_email, reviewer_email, is_retest) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.settings (id, key, value, description, created_at, updated_at) FROM stdin;
f85f9146-4cd8-4f45-a3b6-2289e7af249f	session_timeout	24h	Default session timeout duration	2025-05-31 04:50:01.402731+08	2025-05-31 04:50:01.402731+08
2318232f-5c35-45d3-bbfa-e46fe18f3826	email_verification_required	false	Whether email verification is required for new users	2025-05-31 04:50:01.404058+08	2025-05-31 04:50:01.404058+08
53eeb4ef-8189-4c4e-a20e-f1f5ab784b5c	max_file_upload_size	10485760	Maximum file upload size in bytes (10MB)	2025-05-31 04:50:01.404058+08	2025-05-31 04:50:01.404058+08
c2d8be8e-b27a-456d-ba21-90306bfa18b4	allowed_email_domains		Comma-separated list of allowed email domains	2025-05-31 04:50:01.404058+08	2025-05-31 04:50:01.404058+08
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_roles (user_id, role) FROM stdin;
60952129-08e4-4ab3-a912-fcd1bdad69ec	auditor
57ed19c6-cc3c-4f82-ac11-5104b18ec476	admin
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password, name, created_at) FROM stdin;
60952129-08e4-4ab3-a912-fcd1bdad69ec	auditor@vulnstudio.com	$2a$10$YP4n6g0GOb3dodP4BcUhsutJZlK/yQYzQNj3I4Ev2zaFm6BiqNsn6	Auditor	2025-06-03 23:28:59.199935+08
57ed19c6-cc3c-4f82-ac11-5104b18ec476	admin@vulnstudio.com	$2a$10$Zj7xj0gYz9FLGafpOKCfreHGsO4CF0EkpdzFqYzUxI0xlJva/8Sia	Admin	2025-06-03 23:37:20.935657+08
\.


--
-- Data for Name: vulndb; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vulndb (id, created_at, updated_at, title, background, details, remediation, ref_links, created_by) FROM stdin;
\.


--
-- Data for Name: vulnerabilities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vulnerabilities (id, created_at, updated_at, report_id, title, severity, cvss_score, cvss_vector, affected_versions, background, details, remediation, ref_links, request_response, created_by, poc_images, vulnerability_id, display_order, current_status, retest_date, retest_result, retest_images) FROM stdin;
\.


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vulndb vulndb_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vulndb
    ADD CONSTRAINT vulndb_pkey PRIMARY KEY (id);


--
-- Name: vulnerabilities vulnerabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vulnerabilities
    ADD CONSTRAINT vulnerabilities_pkey PRIMARY KEY (id);


--
-- Name: reports update_reports_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reports_modtime BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: vulndb update_vulndb_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vulndb_modtime BEFORE UPDATE ON public.vulndb FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: vulnerabilities update_vulnerabilities_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vulnerabilities_modtime BEFORE UPDATE ON public.vulnerabilities FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: attachments attachments_vulnerability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_vulnerability_id_fkey FOREIGN KEY (vulnerability_id) REFERENCES public.vulnerabilities(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: vulnerabilities vulnerabilities_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vulnerabilities
    ADD CONSTRAINT vulnerabilities_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id);

