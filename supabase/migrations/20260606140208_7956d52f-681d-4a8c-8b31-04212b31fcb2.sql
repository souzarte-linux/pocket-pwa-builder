CREATE TABLE IF NOT EXISTS public.work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform_id uuid REFERENCES public.platforms(id) ON DELETE SET NULL,
  product_type public.product_type DEFAULT 'alimento',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  break_minutes integer NOT NULL DEFAULT 0,
  start_km numeric NOT NULL DEFAULT 0,
  end_km numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_sessions TO authenticated;
GRANT ALL ON public.work_sessions TO service_role;

ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own work_sessions all"
  ON public.work_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS work_sessions_user_started_idx
  ON public.work_sessions (user_id, started_at DESC);