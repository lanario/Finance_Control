-- Tabela de serviços (para reutilização em vendas)
CREATE TABLE IF NOT EXISTS servicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  codigo TEXT, -- Código do serviço (SKU, código interno, etc)
  descricao TEXT,
  valor_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unidade TEXT DEFAULT 'un', -- un, h (hora), d (dia), etc
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, codigo) -- Garante que o código seja único por usuário
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_servicos_user_id ON servicos(user_id);
CREATE INDEX IF NOT EXISTS idx_servicos_categoria_id ON servicos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_servicos_ativo ON servicos(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_servicos_codigo ON servicos(codigo) WHERE codigo IS NOT NULL;

-- RLS (Row Level Security) Policies
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;

-- Políticas para servicos
DROP POLICY IF EXISTS "Users can view their own servicos" ON servicos;
DROP POLICY IF EXISTS "Users can insert their own servicos" ON servicos;
DROP POLICY IF EXISTS "Users can update their own servicos" ON servicos;
DROP POLICY IF EXISTS "Users can delete their own servicos" ON servicos;

CREATE POLICY "Users can view their own servicos"
  ON servicos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own servicos"
  ON servicos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own servicos"
  ON servicos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own servicos"
  ON servicos FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_servicos_updated_at ON servicos;

CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON servicos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar campo servico_id na tabela vendas
ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS servico_id UUID REFERENCES servicos(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_vendas_servico_id ON vendas(servico_id);

