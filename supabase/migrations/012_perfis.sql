-- Migration 012: Tabela de perfis de usuário
-- ============================================

-- Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS perfis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_perfis_user_id ON perfis(user_id);

-- RLS (Row Level Security) Policies
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Políticas para perfis
DROP POLICY IF EXISTS "Users can view their own perfis" ON perfis;
DROP POLICY IF EXISTS "Users can insert their own perfis" ON perfis;
DROP POLICY IF EXISTS "Users can update their own perfis" ON perfis;
DROP POLICY IF EXISTS "Users can delete their own perfis" ON perfis;

CREATE POLICY "Users can view their own perfis"
  ON perfis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own perfis"
  ON perfis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own perfis"
  ON perfis FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own perfis"
  ON perfis FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_perfis_updated_at ON perfis;
CREATE TRIGGER update_perfis_updated_at BEFORE UPDATE ON perfis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- NOTA: Criar bucket de storage manualmente no Supabase Dashboard
-- ============================================
-- 1. Vá para Storage no dashboard do Supabase
-- 2. Crie um novo bucket chamado "avatars"
-- 3. Configure as políticas de acesso:
--    - Public: false (ou true se quiser URLs públicas)
--    - Policies: Permitir upload/read apenas para o próprio usuário
-- ============================================
