-- ==============================================================================
-- Migration: 20260813000000_phase2f_schema_foundations.sql
-- Fase 2F / Lote 2F.0: Congelamento, Baseline, Migrations & Tipos Supabase
-- (Auto-resiliente: cria as tabelas base caso o banco esteja limpo, ou adiciona colunas se já existirem)
-- ==============================================================================

-- 1. Profiles: Tabela base e Odômetro Inicial
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  social_handle TEXT,
  vehicle TEXT DEFAULT 'moto',
  plate TEXT,
  avatar_url TEXT,
  daily_goal NUMERIC(10,2) DEFAULT 200,
  monthly_goal NUMERIC(10,2) DEFAULT 3450,
  weekly_goal NUMERIC(10,2),
  tank_size_l NUMERIC,
  avg_consumption_kml NUMERIC,
  oil_change_km NUMERIC,
  tire_size_front TEXT,
  tire_size_rear TEXT,
  has_bag BOOLEAN DEFAULT true,
  initial_odometer_km NUMERIC NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'own profile select') THEN
    CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'own profile insert') THEN
    CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'own profile update') THEN
    CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initial_odometer_km NUMERIC NULL;

-- 2. Parts Catalog: Tabela e Expansão de Metadados
CREATE TABLE IF NOT EXISTS public.parts_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NULL,
  manufacturer TEXT NULL,
  brand TEXT NULL,
  model TEXT NULL,
  sku TEXT NULL,
  default_life_km NUMERIC NULL,
  unit TEXT NULL DEFAULT 'un',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parts_catalog ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'parts_catalog' AND policyname = 'Users can view their own parts catalog') THEN
    CREATE POLICY "Users can view their own parts catalog" ON public.parts_catalog FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'parts_catalog' AND policyname = 'Users can insert their own parts catalog') THEN
    CREATE POLICY "Users can insert their own parts catalog" ON public.parts_catalog FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'parts_catalog' AND policyname = 'Users can update their own parts catalog') THEN
    CREATE POLICY "Users can update their own parts catalog" ON public.parts_catalog FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'parts_catalog' AND policyname = 'Users can delete their own parts catalog') THEN
    CREATE POLICY "Users can delete their own parts catalog" ON public.parts_catalog FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE public.parts_catalog ADD COLUMN IF NOT EXISTS category TEXT NULL;
ALTER TABLE public.parts_catalog ADD COLUMN IF NOT EXISTS manufacturer TEXT NULL;
ALTER TABLE public.parts_catalog ADD COLUMN IF NOT EXISTS brand TEXT NULL;
ALTER TABLE public.parts_catalog ADD COLUMN IF NOT EXISTS model TEXT NULL;
ALTER TABLE public.parts_catalog ADD COLUMN IF NOT EXISTS sku TEXT NULL;
ALTER TABLE public.parts_catalog ADD COLUMN IF NOT EXISTS default_life_km NUMERIC NULL;
ALTER TABLE public.parts_catalog ADD COLUMN IF NOT EXISTS unit TEXT NULL DEFAULT 'un';
ALTER TABLE public.parts_catalog ADD COLUMN IF NOT EXISTS notes TEXT NULL;

-- 3. Card Domain: card_operators e card_brand_operators
CREATE TABLE IF NOT EXISTS public.card_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  card_due_day INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.card_operators ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'card_operators' AND policyname = 'Users can view their own card operators') THEN
    CREATE POLICY "Users can view their own card operators" ON public.card_operators FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'card_operators' AND policyname = 'Users can insert their own card operators') THEN
    CREATE POLICY "Users can insert their own card operators" ON public.card_operators FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'card_operators' AND policyname = 'Users can update their own card operators') THEN
    CREATE POLICY "Users can update their own card operators" ON public.card_operators FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'card_operators' AND policyname = 'Users can delete their own card operators') THEN
    CREATE POLICY "Users can delete their own card operators" ON public.card_operators FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.card_brand_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.card_operators(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.card_brand_operators ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'card_brand_operators' AND policyname = 'Users can view their own card brand operators') THEN
    CREATE POLICY "Users can view their own card brand operators" ON public.card_brand_operators FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'card_brand_operators' AND policyname = 'Users can insert their own card brand operators') THEN
    CREATE POLICY "Users can insert their own card brand operators" ON public.card_brand_operators FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'card_brand_operators' AND policyname = 'Users can update their own card brand operators') THEN
    CREATE POLICY "Users can update their own card brand operators" ON public.card_brand_operators FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'card_brand_operators' AND policyname = 'Users can delete their own card brand operators') THEN
    CREATE POLICY "Users can delete their own card brand operators" ON public.card_brand_operators FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS card_brand_operators_user_op_brand_idx
  ON public.card_brand_operators (user_id, operator_id, brand_name);
