-- Tabela de contas a pagar
CREATE TABLE IF NOT EXISTS contas_a_pagar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  paga BOOLEAN DEFAULT false,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')),
  observacoes TEXT,
  parcelada BOOLEAN DEFAULT false,
  total_parcelas INTEGER DEFAULT 1,
  parcela_atual INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de parcelas de contas a pagar
CREATE TABLE IF NOT EXISTS parcelas_contas_pagar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_pagar_id UUID NOT NULL REFERENCES contas_a_pagar(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  paga BOOLEAN DEFAULT false,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')),
  parcela_numero INTEGER NOT NULL,
  total_parcelas INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_user_id ON contas_a_pagar(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_fornecedor_id ON contas_a_pagar(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_categoria_id ON contas_a_pagar(categoria_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_data_vencimento ON contas_a_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_paga ON contas_a_pagar(paga);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_user_id ON parcelas_contas_pagar(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_conta_pagar_id ON parcelas_contas_pagar(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_data_vencimento ON parcelas_contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_paga ON parcelas_contas_pagar(paga);

-- RLS (Row Level Security) Policies
ALTER TABLE contas_a_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_contas_pagar ENABLE ROW LEVEL SECURITY;

-- Políticas para contas_a_pagar
DROP POLICY IF EXISTS "Users can view their own contas_a_pagar" ON contas_a_pagar;
DROP POLICY IF EXISTS "Users can insert their own contas_a_pagar" ON contas_a_pagar;
DROP POLICY IF EXISTS "Users can update their own contas_a_pagar" ON contas_a_pagar;
DROP POLICY IF EXISTS "Users can delete their own contas_a_pagar" ON contas_a_pagar;

CREATE POLICY "Users can view their own contas_a_pagar"
  ON contas_a_pagar FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contas_a_pagar"
  ON contas_a_pagar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contas_a_pagar"
  ON contas_a_pagar FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contas_a_pagar"
  ON contas_a_pagar FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para parcelas_contas_pagar
DROP POLICY IF EXISTS "Users can view their own parcelas_contas_pagar" ON parcelas_contas_pagar;
DROP POLICY IF EXISTS "Users can insert their own parcelas_contas_pagar" ON parcelas_contas_pagar;
DROP POLICY IF EXISTS "Users can update their own parcelas_contas_pagar" ON parcelas_contas_pagar;
DROP POLICY IF EXISTS "Users can delete their own parcelas_contas_pagar" ON parcelas_contas_pagar;

CREATE POLICY "Users can view their own parcelas_contas_pagar"
  ON parcelas_contas_pagar FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parcelas_contas_pagar"
  ON parcelas_contas_pagar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parcelas_contas_pagar"
  ON parcelas_contas_pagar FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parcelas_contas_pagar"
  ON parcelas_contas_pagar FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_contas_a_pagar_updated_at ON contas_a_pagar;
DROP TRIGGER IF EXISTS update_parcelas_contas_pagar_updated_at ON parcelas_contas_pagar;

CREATE TRIGGER update_contas_a_pagar_updated_at BEFORE UPDATE ON contas_a_pagar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcelas_contas_pagar_updated_at BEFORE UPDATE ON parcelas_contas_pagar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
