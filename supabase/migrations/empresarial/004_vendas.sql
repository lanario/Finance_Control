-- Tabela de vendas
CREATE TABLE IF NOT EXISTS vendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL,
  valor_desconto DECIMAL(10, 2) DEFAULT 0,
  valor_final DECIMAL(10, 2) NOT NULL,
  data_venda DATE NOT NULL,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito', 'parcelado')),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga', 'cancelada')),
  parcelada BOOLEAN DEFAULT false,
  total_parcelas INTEGER DEFAULT 1,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de parcelas de vendas
CREATE TABLE IF NOT EXISTS parcelas_vendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  recebida BOOLEAN DEFAULT false,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')),
  parcela_numero INTEGER NOT NULL,
  total_parcelas INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_vendas_user_id ON vendas(user_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_categoria_id ON vendas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_user_id ON parcelas_vendas(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_venda_id ON parcelas_vendas(venda_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_data_vencimento ON parcelas_vendas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_recebida ON parcelas_vendas(recebida);

-- RLS (Row Level Security) Policies
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_vendas ENABLE ROW LEVEL SECURITY;

-- Políticas para vendas
DROP POLICY IF EXISTS "Users can view their own vendas" ON vendas;
DROP POLICY IF EXISTS "Users can insert their own vendas" ON vendas;
DROP POLICY IF EXISTS "Users can update their own vendas" ON vendas;
DROP POLICY IF EXISTS "Users can delete their own vendas" ON vendas;

CREATE POLICY "Users can view their own vendas"
  ON vendas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vendas"
  ON vendas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendas"
  ON vendas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vendas"
  ON vendas FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para parcelas_vendas
DROP POLICY IF EXISTS "Users can view their own parcelas_vendas" ON parcelas_vendas;
DROP POLICY IF EXISTS "Users can insert their own parcelas_vendas" ON parcelas_vendas;
DROP POLICY IF EXISTS "Users can update their own parcelas_vendas" ON parcelas_vendas;
DROP POLICY IF EXISTS "Users can delete their own parcelas_vendas" ON parcelas_vendas;

CREATE POLICY "Users can view their own parcelas_vendas"
  ON parcelas_vendas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parcelas_vendas"
  ON parcelas_vendas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parcelas_vendas"
  ON parcelas_vendas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parcelas_vendas"
  ON parcelas_vendas FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_vendas_updated_at ON vendas;
DROP TRIGGER IF EXISTS update_parcelas_vendas_updated_at ON parcelas_vendas;

CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcelas_vendas_updated_at BEFORE UPDATE ON parcelas_vendas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
