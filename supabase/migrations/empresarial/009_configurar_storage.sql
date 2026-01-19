-- =====================================================
-- CONFIGURAÇÃO DO STORAGE - BUCKETS E POLÍTICAS
-- =====================================================
-- Execute este arquivo no SQL Editor do Supabase Empresarial
-- 
-- IMPORTANTE: Antes de executar este SQL, você precisa criar os buckets manualmente:
-- 1. Vá em Storage no dashboard do Supabase
-- 2. Clique em "New bucket"
-- 3. Crie os seguintes buckets:
--    - "Logo" (público: true) - Nome exato com L maiúsculo
--    - "avatars" (público: true)
-- 4. Depois execute este SQL para configurar as políticas
-- =====================================================

-- =====================================================
-- BUCKET: Logo
-- =====================================================
-- Usado para armazenar logos de empresas e templates de orçamento

-- Política para permitir leitura pública de logos (qualquer pessoa pode ler)
DROP POLICY IF EXISTS "Public Access for Logo" ON storage.objects;
CREATE POLICY "Public Access for Logo"
ON storage.objects FOR SELECT
USING (bucket_id = 'Logo');

-- Política para permitir upload de logos apenas para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can upload Logo" ON storage.objects;
CREATE POLICY "Authenticated users can upload Logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'Logo' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir atualização de logos apenas para usuários autenticados
DROP POLICY IF EXISTS "Users can update their own Logo" ON storage.objects;
CREATE POLICY "Users can update their own Logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'Logo' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir exclusão de logos apenas para usuários autenticados
DROP POLICY IF EXISTS "Users can delete their own Logo" ON storage.objects;
CREATE POLICY "Users can delete their own Logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'Logo' 
  AND auth.role() = 'authenticated'
);

-- =====================================================
-- BUCKET: avatars
-- =====================================================
-- Usado para armazenar fotos de perfil dos usuários

-- Política para permitir leitura pública de avatares (qualquer pessoa pode ler)
DROP POLICY IF EXISTS "Public Access for avatars" ON storage.objects;
CREATE POLICY "Public Access for avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Política para permitir upload de avatares apenas para usuários autenticados
-- O path deve começar com o user_id do usuário autenticado
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Política para permitir atualização de avatares apenas pelo próprio usuário
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Política para permitir exclusão de avatares apenas pelo próprio usuário
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Os buckets devem ser criados manualmente no dashboard do Supabase
-- 2. Configure os buckets como PÚBLICOS (public: true) para permitir leitura
-- 3. As políticas acima garantem que:
--    - Qualquer pessoa pode LER os arquivos (público)
--    - Apenas usuários autenticados podem FAZER UPLOAD
--    - Apenas o próprio usuário pode ATUALIZAR/EXCLUIR seus arquivos
-- 4. A estrutura de pastas deve ser: bucket/user_id/arquivo.ext
--    Exemplo: Logo/123e4567-e89b-12d3-a456-426614174000/logo.png
-- =====================================================
