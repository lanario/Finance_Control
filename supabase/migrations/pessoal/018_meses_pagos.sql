-- Migration 018: Tabela para rastrear meses de despesas pagos
-- ============================================================

-- Tabela para rastrear quais meses/anos de despesas foram pagos
CREATE TABLE IF NOT EXISTS meses_pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  paga BOOLEAN NOT NULL DEFAULT true,
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, mes, ano)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_meses_pagos_user_id ON meses_pagos(user_id);
CREATE INDEX IF NOT EXISTS idx_meses_pagos_mes_ano ON meses_pagos(mes, ano);
CREATE INDEX IF NOT EXISTS idx_meses_pagos_user_mes_ano ON meses_pagos(user_id, ano, mes);
CREATE INDEX IF NOT EXISTS idx_meses_pagos_paga ON meses_pagos(paga) WHERE paga = TRUE;

-- RLS (Row Level Security) Policies
ALTER TABLE meses_pagos ENABLE ROW LEVEL SECURITY;

-- Políticas para meses_pagos
DROP POLICY IF EXISTS "Users can view their own meses_pagos" ON meses_pagos;
DROP POLICY IF EXISTS "Users can insert their own meses_pagos" ON meses_pagos;
DROP POLICY IF EXISTS "Users can update their own meses_pagos" ON meses_pagos;
DROP POLICY IF EXISTS "Users can delete their own meses_pagos" ON meses_pagos;

CREATE POLICY "Users can view their own meses_pagos"
  ON meses_pagos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meses_pagos"
  ON meses_pagos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meses_pagos"
  ON meses_pagos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meses_pagos"
  ON meses_pagos FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_meses_pagos_updated_at ON meses_pagos;
CREATE TRIGGER update_meses_pagos_updated_at BEFORE UPDATE ON meses_pagos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
