-- Migration for part maintenance tracking, card operators, companies, and extra expense columns

-- 1. Part maintenance table
CREATE TABLE IF NOT EXISTS public.part_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  life_km NUMERIC NOT NULL,
  last_change_km NUMERIC NOT NULL,
  last_change_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.part_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own part maintenance"
  ON public.part_maintenance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own part maintenance"
  ON public.part_maintenance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own part maintenance"
  ON public.part_maintenance FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own part maintenance"
  ON public.part_maintenance FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Card operators table
CREATE TABLE IF NOT EXISTS public.card_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.card_operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own card operators"
  ON public.card_operators FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own card operators"
  ON public.card_operators FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own card operators"
  ON public.card_operators FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own card operators"
  ON public.card_operators FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own companies"
  ON public.companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies"
  ON public.companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies"
  ON public.companies FOR DELETE
  USING (auth.uid() = user_id);

-- 4. New columns on expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS part_life_km NUMERIC NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS part_brand TEXT NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS part_model TEXT NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS card_brand TEXT NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS card_operator TEXT NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS installment_group_id UUID NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS installment_number INTEGER NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS installment_total INTEGER NULL;
