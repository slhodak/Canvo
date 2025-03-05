BEGIN;

-- Replace node_run_type with run_type and cache_type
-- Add two new columns: run_type and cache_type
ALTER TABLE nodes
ADD COLUMN IF NOT EXISTS run_type VARCHAR(255) NOT NULL DEFAULT '';

ALTER TABLE nodes
ADD COLUMN IF NOT EXISTS cache_type VARCHAR(255) NOT NULL DEFAULT '';

-- Create a function that checks if the column exists and performs the migration
DO $$
BEGIN
  -- If the column node_run_type exists, perform the migration
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nodes' AND column_name='node_run_type') THEN
    -- Update the existing nodes according to their deprecated node_run_type
    -- Set the new run type properties
    UPDATE nodes
    SET run_type = 'auto'
    WHERE node_run_type = 'run';

    UPDATE nodes
    SET run_type = 'none'
    WHERE node_run_type = 'source';

    -- Set the new cache type properties
    UPDATE nodes
    SET cache_type = 'no_cache'
    WHERE node_run_type  = 'run';

    UPDATE nodes
    SET cache_type = 'cache'
    WHERE node_run_type IN ('source', 'cache');

    -- Finally drop the old node_run_type column
    ALTER TABLE nodes
    DROP COLUMN IF EXISTS node_run_type;

  ELSE
      RAISE NOTICE 'node_run_type column does not exist; skipping the rest of the migration';
  END IF;
END $$;

COMMIT;
