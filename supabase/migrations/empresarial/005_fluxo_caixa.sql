-- Tabela de fluxo de caixa (registro consolidado de entradas e saídas)
CREATE TABLE IF NOT EXISTS fluxo_caixa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  origem TEXT NOT NULL CHECK (origem IN ('conta_pagar', 'conta_receber', 'venda', 'outro')),
  origem_id UUID, -- ID da origem (conta_pagar_id, conta_receber_id, venda_id, etc)
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_movimentacao DATE NOT NULL,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_user_id ON fluxo_caixa(user_id);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_tipo ON fluxo_caixa(tipo);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_origem ON fluxo_caixa(origem);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_data_movimentacao ON fluxo_caixa(data_movimentacao);

-- RLS (Row Level Security) Policies
ALTER TABLE fluxo_caixa ENABLE ROW LEVEL SECURITY;

-- Políticas para fluxo_caixa
DROP POLICY IF EXISTS "Users can view their own fluxo_caixa" ON fluxo_caixa;
DROP POLICY IF EXISTS "Users can insert their own fluxo_caixa" ON fluxo_caixa;
DROP POLICY IF EXISTS "Users can update their own fluxo_caixa" ON fluxo_caixa;
DROP POLICY IF EXISTS "Users can delete their own fluxo_caixa" ON fluxo_caixa;

CREATE POLICY "Users can view their own fluxo_caixa"
  ON fluxo_caixa FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fluxo_caixa"
  ON fluxo_caixa FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fluxo_caixa"
  ON fluxo_caixa FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fluxo_caixa"
  ON fluxo_caixa FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_fluxo_caixa_updated_at ON fluxo_caixa;

CREATE TRIGGER update_fluxo_caixa_updated_at BEFORE UPDATE ON fluxo_caixa
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
