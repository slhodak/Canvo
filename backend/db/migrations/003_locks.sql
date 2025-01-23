-- Add a locked column to the blocks and transformations tables

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'blocks' and column_name = 'locked'
  ) THEN
    ALTER TABLE blocks ADD COLUMN locked BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'transformations' and column_name = 'locked'
  ) THEN
    ALTER TABLE transformations ADD COLUMN locked BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
