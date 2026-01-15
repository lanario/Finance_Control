-- Adicionar campo cor aos cartões
ALTER TABLE cartoes
  ADD COLUMN IF NOT EXISTS cor TEXT DEFAULT '#1e3a5f';

-- Tabela para rastrear faturas pagas (fechamento antecipado)
CREATE TABLE IF NOT EXISTS faturas_pagas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia >= 1 AND mes_referencia <= 12),
  ano_referencia INTEGER NOT NULL,
  data_pagamento DATE NOT NULL,
  total_pago DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(cartao_id, mes_referencia, ano_referencia)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_faturas_pagas_cartao_id ON faturas_pagas(cartao_id);
CREATE INDEX IF NOT EXISTS idx_faturas_pagas_user_id ON faturas_pagas(user_id);
CREATE INDEX IF NOT EXISTS idx_faturas_pagas_data ON faturas_pagas(data_pagamento);

-- RLS (Row Level Security) Policies
ALTER TABLE faturas_pagas ENABLE ROW LEVEL SECURITY;

-- Políticas para faturas_pagas (DROP IF EXISTS para evitar erros se já existirem)
DROP POLICY IF EXISTS "Users can view their own faturas_pagas" ON faturas_pagas;
DROP POLICY IF EXISTS "Users can insert their own faturas_pagas" ON faturas_pagas;
DROP POLICY IF EXISTS "Users can update their own faturas_pagas" ON faturas_pagas;
DROP POLICY IF EXISTS "Users can delete their own faturas_pagas" ON faturas_pagas;

CREATE POLICY "Users can view their own faturas_pagas"
  ON faturas_pagas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own faturas_pagas"
  ON faturas_pagas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own faturas_pagas"
  ON faturas_pagas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own faturas_pagas"
  ON faturas_pagas FOR DELETE
  USING (auth.uid() = user_id);
