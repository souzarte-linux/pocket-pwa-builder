
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS weekly_goal numeric DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS vehicle_brand text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_year integer,
  ADD COLUMN IF NOT EXISTS tank_size_l numeric,
  ADD COLUMN IF NOT EXISTS avg_consumption_kml numeric,
  ADD COLUMN IF NOT EXISTS oil_change_km numeric,
  ADD COLUMN IF NOT EXISTS tire_size_front text,
  ADD COLUMN IF NOT EXISTS tire_size_rear text,
  ADD COLUMN IF NOT EXISTS has_bag boolean DEFAULT false;
