
CREATE TABLE public.gas_stations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  address text,
  brand text NOT NULL,
  fuel_types jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.gas_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own gas stations"
  ON public.gas_stations FOR ALL
  USING (auth.uid() = user_id);

ALTER TABLE public.expenses ADD COLUMN receipt_number text;

