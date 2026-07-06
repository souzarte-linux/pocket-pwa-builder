
ALTER TABLE public.billing_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own billing cycles" ON public.billing_cycles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own financial adjustments" ON public.financial_adjustments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
