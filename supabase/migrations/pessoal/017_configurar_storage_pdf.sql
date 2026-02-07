-- Migration 017: Configuração do Storage para PDFs de Faturas
-- ============================================

-- IMPORTANTE: Antes de executar este SQL, você precisa criar o bucket manualmente:
-- 1. Vá em Storage no dashboard do Supabase
-- 2. Clique em "New bucket"
-- 3. Crie o bucket: "faturas-pdf"
-- 4. Configure como PRIVADO (public: false) para segurança

-- Políticas para o bucket faturas-pdf
DROP POLICY IF EXISTS "Users can view their own faturas-pdf" ON storage.objects;
CREATE POLICY "Users can view their own faturas-pdf"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'faturas-pdf' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload their own faturas-pdf" ON storage.objects;
CREATE POLICY "Users can upload their own faturas-pdf"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'faturas-pdf' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own faturas-pdf" ON storage.objects;
CREATE POLICY "Users can update their own faturas-pdf"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'faturas-pdf' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own faturas-pdf" ON storage.objects;
CREATE POLICY "Users can delete their own faturas-pdf"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'faturas-pdf' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
