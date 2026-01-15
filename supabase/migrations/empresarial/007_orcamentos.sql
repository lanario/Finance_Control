-- Tabela de orçamentos
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado', 'convertido')),
  valor_total DECIMAL(10, 2) DEFAULT 0,
  desconto DECIMAL(10, 2) DEFAULT 0,
  valor_final DECIMAL(10, 2) DEFAULT 0,
  observacoes TEXT,
  condicoes_pagamento TEXT,
  prazo_entrega TEXT,
  -- Personalização do PDF
  cor_primaria TEXT DEFAULT '#6366f1',
  cor_secundaria TEXT DEFAULT '#8b5cf6',
  logo_url TEXT,
  cabecalho_personalizado TEXT,
  rodape_personalizado TEXT,
  -- Dados do cliente (snapshot no momento da criação)
  cliente_nome TEXT,
  cliente_email TEXT,
  cliente_telefone TEXT,
  cliente_endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de itens do orçamento
CREATE TABLE IF NOT EXISTS orcamento_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_numero INTEGER NOT NULL,
  descricao TEXT NOT NULL,
  quantidade DECIMAL(10, 3) DEFAULT 1,
  unidade TEXT DEFAULT 'un',
  valor_unitario DECIMAL(10, 2) NOT NULL,
  desconto DECIMAL(10, 2) DEFAULT 0,
  valor_total DECIMAL(10, 2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(orcamento_id, item_numero)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_orcamentos_user_id ON orcamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente_id ON orcamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_data_emissao ON orcamentos(data_emissao);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_orcamento_id ON orcamento_itens(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_user_id ON orcamento_itens(user_id);

-- RLS (Row Level Security) Policies
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_itens ENABLE ROW LEVEL SECURITY;

-- Políticas para orcamentos
DROP POLICY IF EXISTS "Users can view their own orcamentos" ON orcamentos;
DROP POLICY IF EXISTS "Users can insert their own orcamentos" ON orcamentos;
DROP POLICY IF EXISTS "Users can update their own orcamentos" ON orcamentos;
DROP POLICY IF EXISTS "Users can delete their own orcamentos" ON orcamentos;

CREATE POLICY "Users can view their own orcamentos"
  ON orcamentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orcamentos"
  ON orcamentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orcamentos"
  ON orcamentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orcamentos"
  ON orcamentos FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para orcamento_itens
DROP POLICY IF EXISTS "Users can view their own orcamento_itens" ON orcamento_itens;
DROP POLICY IF EXISTS "Users can insert their own orcamento_itens" ON orcamento_itens;
DROP POLICY IF EXISTS "Users can update their own orcamento_itens" ON orcamento_itens;
DROP POLICY IF EXISTS "Users can delete their own orcamento_itens" ON orcamento_itens;

CREATE POLICY "Users can view their own orcamento_itens"
  ON orcamento_itens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orcamento_itens"
  ON orcamento_itens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orcamento_itens"
  ON orcamento_itens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orcamento_itens"
  ON orcamento_itens FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_orcamentos_updated_at ON orcamentos;
DROP TRIGGER IF EXISTS update_orcamento_itens_updated_at ON orcamento_itens;

CREATE TRIGGER update_orcamentos_updated_at BEFORE UPDATE ON orcamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orcamento_itens_updated_at BEFORE UPDATE ON orcamento_itens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
