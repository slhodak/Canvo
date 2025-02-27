-- Replace node_run_type with run_type and cache_type

-- Add two new columns: run_type and cache_type
ALTER TABLE nodes
ADD COLUMN run_type VARCHAR(255) NOT NULL DEFAULT '';

ALTER TABLE nodes
ADD COLUMN cache_type VARCHAR(255) NOT NULL DEFAULT '';

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
DROP COLUMN node_run_type;
