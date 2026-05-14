ALTER TABLE routes 
  ADD COLUMN started_at timestamp with time zone,
  ADD COLUMN ended_at timestamp with time zone,
  ADD COLUMN break_minutes integer DEFAULT 0 NOT NULL,
  ADD COLUMN start_km numeric DEFAULT 0 NOT NULL,
  ADD COLUMN end_km numeric DEFAULT 0 NOT NULL;

-- If you want to drop the old table later, you can run:
-- DROP TABLE work_sessions;
