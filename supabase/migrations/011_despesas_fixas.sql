-- Migration 011: Tabela de despesas fixas
-- ============================================

-- Tabela de despesas fixas (recorrentes mensais)
CREATE TABLE IF NOT EXISTS despesas_fixas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  categoria TEXT NOT NULL,
  metodo_pagamento TEXT NOT NULL DEFAULT 'cartao',
  cartao_id UUID REFERENCES cartoes(id) ON DELETE SET NULL,
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela para rastrear quais despesas fixas já foram criadas em cada mês
CREATE TABLE IF NOT EXISTS despesas_fixas_mensais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  despesa_fixa_id UUID NOT NULL REFERENCES despesas_fixas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(despesa_fixa_id, mes, ano)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_user_id ON despesas_fixas(user_id);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_ativa ON despesas_fixas(ativa);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_mensais_despesa_fixa_id ON despesas_fixas_mensais(despesa_fixa_id);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_mensais_user_id ON despesas_fixas_mensais(user_id);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_mensais_mes_ano ON despesas_fixas_mensais(mes, ano);

-- RLS (Row Level Security) Policies
ALTER TABLE despesas_fixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas_fixas_mensais ENABLE ROW LEVEL SECURITY;

-- Políticas para despesas_fixas
DROP POLICY IF EXISTS "Users can view their own despesas_fixas" ON despesas_fixas;
DROP POLICY IF EXISTS "Users can insert their own despesas_fixas" ON despesas_fixas;
DROP POLICY IF EXISTS "Users can update their own despesas_fixas" ON despesas_fixas;
DROP POLICY IF EXISTS "Users can delete their own despesas_fixas" ON despesas_fixas;

CREATE POLICY "Users can view their own despesas_fixas"
  ON despesas_fixas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own despesas_fixas"
  ON despesas_fixas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own despesas_fixas"
  ON despesas_fixas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own despesas_fixas"
  ON despesas_fixas FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para despesas_fixas_mensais
DROP POLICY IF EXISTS "Users can view their own despesas_fixas_mensais" ON despesas_fixas_mensais;
DROP POLICY IF EXISTS "Users can insert their own despesas_fixas_mensais" ON despesas_fixas_mensais;
DROP POLICY IF EXISTS "Users can update their own despesas_fixas_mensais" ON despesas_fixas_mensais;
DROP POLICY IF EXISTS "Users can delete their own despesas_fixas_mensais" ON despesas_fixas_mensais;

CREATE POLICY "Users can view their own despesas_fixas_mensais"
  ON despesas_fixas_mensais FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own despesas_fixas_mensais"
  ON despesas_fixas_mensais FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own despesas_fixas_mensais"
  ON despesas_fixas_mensais FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own despesas_fixas_mensais"
  ON despesas_fixas_mensais FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_despesas_fixas_updated_at ON despesas_fixas;
CREATE TRIGGER update_despesas_fixas_updated_at BEFORE UPDATE ON despesas_fixas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
