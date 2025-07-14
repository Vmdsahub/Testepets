/*
  Create game-assets storage bucket for storing game images and files
  
  This migration creates:
  1. A storage bucket for game assets
  2. Policies for reading and uploading files
*/

-- Create the game-assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-assets', 'game-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all files in the bucket
CREATE POLICY "Public read access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'game-assets');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'game-assets' AND auth.role() = 'authenticated');

-- Allow admins to delete files  
CREATE POLICY "Admins can delete files" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'game-assets' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Allow users to update their own files, admins can update any file
CREATE POLICY "Users can update own files, admins can update any" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'game-assets' 
  AND (
    auth.uid() = owner
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
);
