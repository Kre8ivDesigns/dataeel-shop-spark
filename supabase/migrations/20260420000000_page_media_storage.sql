-- Create a public storage bucket for page media (images, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'page-media',
  'page-media',
  true,
  5242880, -- 5 MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload files
CREATE POLICY "Admins can upload page media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'page-media'
    AND public.is_admin(auth.uid())
  );

-- Allow admins to update/replace files
CREATE POLICY "Admins can update page media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'page-media'
    AND public.is_admin(auth.uid())
  );

-- Allow admins to delete files
CREATE POLICY "Admins can delete page media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'page-media'
    AND public.is_admin(auth.uid())
  );

-- Allow public (anon + authenticated) to read files in this bucket
CREATE POLICY "Public can view page media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'page-media');
