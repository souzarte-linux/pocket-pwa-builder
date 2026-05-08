CREATE TABLE public.oil_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  km_at_change numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.oil_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own oil_changes all" ON public.oil_changes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_oil_changes_user_date ON public.oil_changes(user_id, changed_at DESC);