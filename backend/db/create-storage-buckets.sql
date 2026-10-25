-- Create required Supabase storage buckets (strictly private for Zero-Trust KYC vault)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('ev-documents', 'ev-documents', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('documents', 'documents', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 52428800;

-- Drop insecure wide-open public storage RLS policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow Deletes" ON storage.objects;

-- Storage objects are accessed exclusively via backend service-role API
-- generating short-lived, cryptographically signed URLs.
