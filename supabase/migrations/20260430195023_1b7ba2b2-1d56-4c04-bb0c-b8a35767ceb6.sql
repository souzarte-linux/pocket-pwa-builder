
-- ENUMS
CREATE TYPE public.payment_cycle AS ENUM ('semanal', 'quinzenal', 'mensal');
CREATE TYPE public.product_type AS ENUM ('alimento', 'pacote', 'documento', 'outro');
CREATE TYPE public.expense_category AS ENUM ('combustivel', 'manutencao', 'alimentacao');
CREATE TYPE public.payment_method AS ENUM ('dinheiro', 'pix', 'cartao', 'carteira');
CREATE TYPE public.vehicle_type AS ENUM ('moto', 'carro', 'bike', 'patinete');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  social_handle TEXT,
  vehicle vehicle_type DEFAULT 'moto',
  plate TEXT,
  avatar_url TEXT,
  daily_goal NUMERIC(10,2) DEFAULT 200,
  monthly_goal NUMERIC(10,2) DEFAULT 3450,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PLATFORMS
CREATE TABLE public.platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cycle payment_cycle NOT NULL DEFAULT 'semanal',
  payment_day TEXT,
  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  pix_key_type TEXT,
  pix_key TEXT,
  pix_bank TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROUTES
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES public.platforms(id) ON DELETE SET NULL,
  origin TEXT,
  destination TEXT,
  distance_km NUMERIC(8,2) NOT NULL DEFAULT 0,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tip NUMERIC(10,2) NOT NULL DEFAULT 0,
  product_type product_type NOT NULL DEFAULT 'alimento',
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EXPENSES
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category expense_category NOT NULL,
  title TEXT NOT NULL,
  vendor TEXT,
  amount NUMERIC(10,2) NOT NULL,
  liters NUMERIC(8,2),
  fuel_type TEXT,
  price_per_liter NUMERIC(8,3),
  odometer_km NUMERIC(10,1),
  description TEXT,
  payment_method payment_method DEFAULT 'pix',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DAILY TOTALS
CREATE TABLE public.daily_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES public.platforms(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  distance_km NUMERIC(8,2) DEFAULT 0,
  product_type product_type DEFAULT 'alimento',
  subtract_routes BOOLEAN DEFAULT false,
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_totals ENABLE ROW LEVEL SECURITY;

-- POLICIES: profiles
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Generic policies for owned tables
CREATE POLICY "own platforms all" ON public.platforms FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own routes all" ON public.routes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own expenses all" ON public.expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own daily_totals all" ON public.daily_totals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TRIGGER: create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- INDEXES
CREATE INDEX idx_routes_user_date ON public.routes(user_id, occurred_at DESC);
CREATE INDEX idx_expenses_user_date ON public.expenses(user_id, occurred_at DESC);
CREATE INDEX idx_platforms_user ON public.platforms(user_id);
CREATE INDEX idx_daily_totals_user_date ON public.daily_totals(user_id, occurred_at DESC);
