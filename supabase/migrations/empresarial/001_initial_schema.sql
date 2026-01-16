-- Schema inicial para Financeiro Empresarial
-- Tabelas base: categorias, fornecedores, clientes

-- Tabela de categorias de despesas empresariais
CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#6366f1', -- Cor padrão (roxo)
  tipo TEXT NOT NULL CHECK (tipo IN ('despesa', 'receita')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, nome, tipo)
);

-- Tabela de fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  cpf TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT,
  cpf TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categorias(tipo);
CREATE INDEX IF NOT EXISTS idx_fornecedores_user_id ON fornecedores(user_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores(ativo);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON clientes(ativo);

-- RLS (Row Level Security) Policies
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias
DROP POLICY IF EXISTS "Users can view their own categorias" ON categorias;
DROP POLICY IF EXISTS "Users can insert their own categorias" ON categorias;
DROP POLICY IF EXISTS "Users can update their own categorias" ON categorias;
DROP POLICY IF EXISTS "Users can delete their own categorias" ON categorias;

CREATE POLICY "Users can view their own categorias"
  ON categorias FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categorias"
  ON categorias FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categorias"
  ON categorias FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categorias"
  ON categorias FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para fornecedores
DROP POLICY IF EXISTS "Users can view their own fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Users can insert their own fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Users can update their own fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Users can delete their own fornecedores" ON fornecedores;

CREATE POLICY "Users can view their own fornecedores"
  ON fornecedores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fornecedores"
  ON fornecedores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fornecedores"
  ON fornecedores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fornecedores"
  ON fornecedores FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para clientes
DROP POLICY IF EXISTS "Users can view their own clientes" ON clientes;
DROP POLICY IF EXISTS "Users can insert their own clientes" ON clientes;
DROP POLICY IF EXISTS "Users can update their own clientes" ON clientes;
DROP POLICY IF EXISTS "Users can delete their own clientes" ON clientes;

CREATE POLICY "Users can view their own clientes"
  ON clientes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clientes"
  ON clientes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clientes"
  ON clientes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clientes"
  ON clientes FOR DELETE
  USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_categorias_updated_at ON categorias;
DROP TRIGGER IF EXISTS update_fornecedores_updated_at ON fornecedores;
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;

CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON fornecedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
