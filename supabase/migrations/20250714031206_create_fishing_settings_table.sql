/*
  Create fishing settings table to store global fishing game configurations
  
  This migration creates:
  1. A table to store fishing game settings (wave intensity, distortion, animation speed, background image)
  2. Policies to allow read access for all users and write access only for admins
  3. Initial default settings
*/

-- Create fishing_settings table
CREATE TABLE IF NOT EXISTS fishing_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wave_intensity DECIMAL(3,2) DEFAULT 0.50 CHECK (wave_intensity >= 0 AND wave_intensity <= 1),
  distortion_amount DECIMAL(3,2) DEFAULT 0.30 CHECK (distortion_amount >= 0 AND distortion_amount <= 1),
  animation_speed DECIMAL(3,2) DEFAULT 1.00 CHECK (animation_speed >= 0 AND animation_speed <= 2),
  background_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE fishing_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read fishing settings
CREATE POLICY "Allow read access to fishing settings" ON fishing_settings 
FOR SELECT USING (true);

-- Policy: Only admins can modify fishing settings
CREATE POLICY "Allow admin modifications to fishing settings" ON fishing_settings 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Insert default settings (only one row should exist)
INSERT INTO fishing_settings (wave_intensity, distortion_amount, animation_speed, background_image_url)
VALUES (0.50, 0.30, 1.00, null)
ON CONFLICT DO NOTHING;

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_fishing_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
CREATE TRIGGER fishing_settings_updated_at_trigger
  BEFORE UPDATE ON fishing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_fishing_settings_updated_at();
