-- Migration: Add exclusion constraint to prevent overlapping active billing cycles per platform

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE billing_cycles
ADD CONSTRAINT no_overlapping_cycles
EXCLUDE USING gist (
  platform_id WITH =,
  daterange(period_start, period_end, '[]') WITH &&
) WHERE (status <> 'cancelado');
