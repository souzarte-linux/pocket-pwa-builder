
CREATE TABLE IF NOT EXISTS billing_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id uuid NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  expected_payment_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS financial_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id uuid NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  billing_cycle_id uuid REFERENCES billing_cycles(id) ON DELETE SET NULL,
  type text NOT NULL,
  amount numeric NOT NULL,
  description text,
  occurred_at date NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE routes ADD COLUMN IF NOT EXISTS billing_cycle_id uuid REFERENCES billing_cycles(id) ON DELETE SET NULL;
ALTER TABLE daily_totals ADD COLUMN IF NOT EXISTS billing_cycle_id uuid REFERENCES billing_cycles(id) ON DELETE SET NULL;

