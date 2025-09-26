-- Ensure library sections are always populated

-- Set defaults
ALTER TABLE IF EXISTS videos
  ALTER COLUMN section SET DEFAULT 'form';

ALTER TABLE IF EXISTS documents
  ALTER COLUMN section SET DEFAULT 'documents';

-- Backfill existing nulls
UPDATE videos SET section = 'form' WHERE section IS NULL;
UPDATE documents SET section = 'documents' WHERE section IS NULL;


