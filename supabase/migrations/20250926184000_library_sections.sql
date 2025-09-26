-- Add section tagging for library content

ALTER TABLE IF EXISTS videos
  ADD COLUMN IF NOT EXISTS section text;

ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS section text;

-- Defaults: videos default to 'form', documents to 'documents'
UPDATE videos SET section = COALESCE(section, 'form');
UPDATE documents SET section = COALESCE(section, 'documents');


