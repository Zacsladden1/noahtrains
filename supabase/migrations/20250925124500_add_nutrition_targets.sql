-- Create per-user nutrition targets table
CREATE TABLE IF NOT EXISTS nutrition_targets (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  calories integer DEFAULT 2200,
  protein_g numeric DEFAULT 150,
  carbs_g numeric DEFAULT 250,
  fat_g numeric DEFAULT 80,
  water_ml integer DEFAULT 3000,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE nutrition_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own targets"
  ON nutrition_targets FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_nt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_nt_updated_at
  BEFORE UPDATE ON nutrition_targets
  FOR EACH ROW EXECUTE FUNCTION update_nt_updated_at();


