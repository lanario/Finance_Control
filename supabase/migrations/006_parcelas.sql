-- Tabela de parcelas de compras parceladas
CREATE TABLE IF NOT EXISTS parcelas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compra_id UUID REFERENCES compras(id) ON DELETE CASCADE,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  numero_parcela INTEGER NOT NULL CHECK (numero_parcela >= 1),
  total_parcelas INTEGER NOT NULL CHECK (total_parcelas >= 1),
  data_vencimento DATE NOT NULL,
  categoria TEXT NOT NULL,
  paga BOOLEAN DEFAULT FALSE,
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CHECK (numero_parcela <= total_parcelas)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_parcelas_user_id ON parcelas(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_compra_id ON parcelas(compra_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_cartao_id ON parcelas(cartao_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_data_vencimento ON parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_paga ON parcelas(paga);

-- RLS (Row Level Security) Policies
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;

-- Políticas para parcelas
DROP POLICY IF EXISTS "Users can view their own parcelas" ON parcelas;
DROP POLICY IF EXISTS "Users can insert their own parcelas" ON parcelas;
DROP POLICY IF EXISTS "Users can update their own parcelas" ON parcelas;
DROP POLICY IF EXISTS "Users can delete their own parcelas" ON parcelas;

CREATE POLICY "Users can view their own parcelas"
  ON parcelas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parcelas"
  ON parcelas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parcelas"
  ON parcelas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parcelas"
  ON parcelas FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_parcelas_updated_at ON parcelas;

CREATE TRIGGER update_parcelas_updated_at BEFORE UPDATE ON parcelas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar campo para indicar se uma compra é parcelada
ALTER TABLE compras
  ADD COLUMN IF NOT EXISTS parcelada BOOLEAN DEFAULT FALSE;

ALTER TABLE compras
  ADD COLUMN IF NOT EXISTS total_parcelas INTEGER CHECK (total_parcelas >= 1);
