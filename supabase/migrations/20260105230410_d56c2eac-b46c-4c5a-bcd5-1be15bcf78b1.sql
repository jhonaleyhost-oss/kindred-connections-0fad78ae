-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('free', 'premium', 'reseller', 'admin');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  panel_creations_count INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pterodactyl_servers table
CREATE TABLE public.pterodactyl_servers (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  plta_key TEXT NOT NULL,
  pltc_key TEXT NOT NULL,
  server_type TEXT NOT NULL DEFAULT 'public',
  is_active BOOLEAN NOT NULL DEFAULT true,
  location_id INTEGER NOT NULL DEFAULT 1,
  egg_id INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_panels table to store created panels
CREATE TABLE public.user_panels (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id UUID NOT NULL REFERENCES public.pterodactyl_servers(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  login_url TEXT NOT NULL,
  ptero_user_id INTEGER,
  ptero_server_id INTEGER,
  ram INTEGER NOT NULL,
  cpu INTEGER NOT NULL,
  disk INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pterodactyl_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_panels ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete profiles" 
ON public.profiles FOR DELETE 
USING (public.is_admin(auth.uid()));

-- User roles policies (only admins can manage roles)
CREATE POLICY "Users can view their own role" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles" 
ON public.user_roles FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles" 
ON public.user_roles FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Admins can delete roles" 
ON public.user_roles FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Pterodactyl servers policies
CREATE POLICY "Authenticated users can view active servers" 
ON public.pterodactyl_servers FOR SELECT 
USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins can view all servers" 
ON public.pterodactyl_servers FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert servers" 
ON public.pterodactyl_servers FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update servers" 
ON public.pterodactyl_servers FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete servers" 
ON public.pterodactyl_servers FOR DELETE 
USING (public.is_admin(auth.uid()));

-- User panels policies
CREATE POLICY "Users can view their own panels" 
ON public.user_panels FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own panels" 
ON public.user_panels FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own panels" 
ON public.user_panels FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own panels" 
ON public.user_panels FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all panels" 
ON public.user_panels FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all panels" 
ON public.user_panels FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete all panels" 
ON public.user_panels FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pterodactyl_servers_updated_at
BEFORE UPDATE ON public.pterodactyl_servers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_panels_updated_at
BEFORE UPDATE ON public.user_panels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  
  -- Insert default role (free)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'free');
  
  RETURN new;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert default servers
INSERT INTO public.pterodactyl_servers (name, domain, plta_key, pltc_key, server_type, location_id, egg_id) VALUES
  ('Server 1 (Public)', 'https://legal.jhonaley.net', 'ptla_xxx', 'ptlc_xxx', 'public', 1, 15),
  ('Server 2 (Private VIP)', 'https://server.naell.my.id', 'ptla_xxx', 'ptlc_xxx', 'private', 1, 15),
  ('Server 3 (Private VIP)', 'https://naelprivt.cfxcloud.com', 'ptla_xxx', 'ptlc_xxx', 'private', 1, 15),
  ('Server 4 (Private VIP)', 'https://jhonaley.dotco.biz.id', 'ptla_xxx', 'ptlc_xxx', 'private', 1, 15);