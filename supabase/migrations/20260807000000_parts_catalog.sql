-- Migration for parts_catalog table

CREATE TABLE IF NOT EXISTS public.parts_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parts_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own parts catalog"
  ON public.parts_catalog FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parts catalog"
  ON public.parts_catalog FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parts catalog"
  ON public.parts_catalog FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parts catalog"
  ON public.parts_catalog FOR DELETE
  USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS parts_catalog_user_id_name_key
  ON public.parts_catalog (user_id, name);

-- Populate initial catalog from existing part_maintenance entries
INSERT INTO public.parts_catalog (user_id, name)
SELECT DISTINCT user_id, part_name
FROM public.part_maintenance
ON CONFLICT (user_id, name) DO NOTHING;
