-- Migration 013: Tabela de compras recorrentes
-- ============================================

-- Tabela de compras recorrentes (recorrentes mensais)
CREATE TABLE IF NOT EXISTS compras_recorrentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL CHECK (valor >= 0),
  categoria TEXT NOT NULL,
  metodo_pagamento TEXT NOT NULL DEFAULT 'cartao' CHECK (metodo_pagamento IN ('cartao', 'pix', 'dinheiro', 'debito')),
  cartao_id UUID REFERENCES cartoes(id) ON DELETE SET NULL,
  dia_compra INTEGER NOT NULL CHECK (dia_compra >= 1 AND dia_compra <= 31),
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela para rastrear quais compras recorrentes já foram criadas em cada mês
CREATE TABLE IF NOT EXISTS compras_recorrentes_mensais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  compra_recorrente_id UUID NOT NULL REFERENCES compras_recorrentes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  valor DECIMAL(10, 2) NOT NULL CHECK (valor >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(compra_recorrente_id, mes, ano)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_user_id ON compras_recorrentes(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_ativa ON compras_recorrentes(ativa) WHERE ativa = TRUE;
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_user_ativa ON compras_recorrentes(user_id, ativa) WHERE ativa = TRUE;
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_mensais_compra_recorrente_id ON compras_recorrentes_mensais(compra_recorrente_id);
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_mensais_user_id ON compras_recorrentes_mensais(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_mensais_mes_ano ON compras_recorrentes_mensais(mes, ano);
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_mensais_user_mes_ano ON compras_recorrentes_mensais(user_id, ano, mes);

-- RLS (Row Level Security) Policies
ALTER TABLE compras_recorrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras_recorrentes_mensais ENABLE ROW LEVEL SECURITY;

-- Políticas para compras_recorrentes
DROP POLICY IF EXISTS "Users can view their own compras_recorrentes" ON compras_recorrentes;
DROP POLICY IF EXISTS "Users can insert their own compras_recorrentes" ON compras_recorrentes;
DROP POLICY IF EXISTS "Users can update their own compras_recorrentes" ON compras_recorrentes;
DROP POLICY IF EXISTS "Users can delete their own compras_recorrentes" ON compras_recorrentes;

CREATE POLICY "Users can view their own compras_recorrentes"
  ON compras_recorrentes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own compras_recorrentes"
  ON compras_recorrentes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compras_recorrentes"
  ON compras_recorrentes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own compras_recorrentes"
  ON compras_recorrentes FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para compras_recorrentes_mensais
DROP POLICY IF EXISTS "Users can view their own compras_recorrentes_mensais" ON compras_recorrentes_mensais;
DROP POLICY IF EXISTS "Users can insert their own compras_recorrentes_mensais" ON compras_recorrentes_mensais;
DROP POLICY IF EXISTS "Users can update their own compras_recorrentes_mensais" ON compras_recorrentes_mensais;
DROP POLICY IF EXISTS "Users can delete their own compras_recorrentes_mensais" ON compras_recorrentes_mensais;

CREATE POLICY "Users can view their own compras_recorrentes_mensais"
  ON compras_recorrentes_mensais FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own compras_recorrentes_mensais"
  ON compras_recorrentes_mensais FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compras_recorrentes_mensais"
  ON compras_recorrentes_mensais FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own compras_recorrentes_mensais"
  ON compras_recorrentes_mensais FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_compras_recorrentes_updated_at ON compras_recorrentes;
CREATE TRIGGER update_compras_recorrentes_updated_at BEFORE UPDATE ON compras_recorrentes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
