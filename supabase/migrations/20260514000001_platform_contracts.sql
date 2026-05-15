
ALTER TYPE payment_cycle ADD VALUE IF NOT EXISTS 'misto';

ALTER TABLE platforms
  ADD COLUMN segment text DEFAULT 'logistica' NOT NULL,
  ADD COLUMN payment_model text DEFAULT 'producao' NOT NULL,
  ADD COLUMN rules jsonb DEFAULT '{}'::jsonb NOT NULL;

