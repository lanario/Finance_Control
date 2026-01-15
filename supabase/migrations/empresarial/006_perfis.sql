-- Tabela de perfis de usuários (para empresa)
CREATE TABLE IF NOT EXISTS perfis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nome TEXT,
  foto_url TEXT,
  empresa_nome TEXT,
  empresa_cnpj TEXT,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_perfis_user_id ON perfis(user_id);

-- RLS (Row Level Security) Policies
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Políticas para perfis
DROP POLICY IF EXISTS "Users can view their own perfil" ON perfis;
DROP POLICY IF EXISTS "Users can insert their own perfil" ON perfis;
DROP POLICY IF EXISTS "Users can update their own perfil" ON perfis;
DROP POLICY IF EXISTS "Users can delete their own perfil" ON perfis;

CREATE POLICY "Users can view their own perfil"
  ON perfis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own perfil"
  ON perfis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own perfil"
  ON perfis FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own perfil"
  ON perfis FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_perfis_updated_at ON perfis;

CREATE TRIGGER update_perfis_updated_at BEFORE UPDATE ON perfis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
