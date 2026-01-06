-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  panel_creations_count INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'free' CHECK (role IN ('free', 'premium', 'reseller', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- User roles policies
CREATE POLICY "Users can view their own role" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can modify roles" 
ON public.user_roles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create pterodactyl_servers table
CREATE TABLE public.pterodactyl_servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  plta_key TEXT NOT NULL,
  pltc_key TEXT NOT NULL,
  server_type TEXT NOT NULL DEFAULT 'public' CHECK (server_type IN ('public', 'private')),
  egg_id INTEGER NOT NULL DEFAULT 15,
  location_id INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pterodactyl_servers
ALTER TABLE public.pterodactyl_servers ENABLE ROW LEVEL SECURITY;

-- Everyone can read active servers
CREATE POLICY "Anyone can view active servers" 
ON public.pterodactyl_servers FOR SELECT 
USING (is_active = true);

-- Only admins can manage servers
CREATE POLICY "Only admins can manage servers" 
ON public.pterodactyl_servers FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create user_panels table
CREATE TABLE public.user_panels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  server_id UUID NOT NULL REFERENCES public.pterodactyl_servers(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  login_url TEXT NOT NULL,
  ram INTEGER NOT NULL DEFAULT 1024,
  cpu INTEGER NOT NULL DEFAULT 40,
  disk INTEGER NOT NULL DEFAULT 1024,
  ptero_user_id INTEGER,
  ptero_server_id INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_panels
ALTER TABLE public.user_panels ENABLE ROW LEVEL SECURITY;

-- Users can view their own panels
CREATE POLICY "Users can view their own panels" 
ON public.user_panels FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own panels
CREATE POLICY "Users can create their own panels" 
ON public.user_panels FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own panels
CREATE POLICY "Users can update their own panels" 
ON public.user_panels FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own panels
CREATE POLICY "Users can delete their own panels" 
ON public.user_panels FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can view all panels
CREATE POLICY "Admins can view all panels" 
ON public.user_panels FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

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

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'free');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();