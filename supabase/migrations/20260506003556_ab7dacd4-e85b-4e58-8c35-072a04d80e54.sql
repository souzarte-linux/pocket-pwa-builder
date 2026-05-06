ALTER TABLE public.work_sessions
  ADD COLUMN IF NOT EXISTS platform_id uuid,
  ADD COLUMN IF NOT EXISTS product_type product_type DEFAULT 'alimento';