-- Migration 014: Tabela de sonhos (metas futuras)
-- ==============================================

-- Tabela de sonhos
CREATE TABLE IF NOT EXISTS sonhos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_objetivo DECIMAL(10, 2) NOT NULL CHECK (valor_objetivo > 0),
  valor_atual DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (valor_atual >= 0),
  data_objetivo DATE,
  valor_mensal DECIMAL(10, 2),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela para rastrear depósitos mensais nos sonhos
CREATE TABLE IF NOT EXISTS sonhos_depositos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sonho_id UUID NOT NULL REFERENCES sonhos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor DECIMAL(10, 2) NOT NULL CHECK (valor > 0),
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(sonho_id, mes, ano)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sonhos_user_id ON sonhos(user_id);
CREATE INDEX IF NOT EXISTS idx_sonhos_ativo ON sonhos(ativo) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_sonhos_user_ativo ON sonhos(user_id, ativo) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_sonhos_depositos_sonho_id ON sonhos_depositos(sonho_id);
CREATE INDEX IF NOT EXISTS idx_sonhos_depositos_user_id ON sonhos_depositos(user_id);
CREATE INDEX IF NOT EXISTS idx_sonhos_depositos_mes_ano ON sonhos_depositos(mes, ano);
CREATE INDEX IF NOT EXISTS idx_sonhos_depositos_user_mes_ano ON sonhos_depositos(user_id, ano, mes);

-- RLS (Row Level Security) Policies
ALTER TABLE sonhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sonhos_depositos ENABLE ROW LEVEL SECURITY;

-- Políticas para sonhos
DROP POLICY IF EXISTS "Users can view their own sonhos" ON sonhos;
DROP POLICY IF EXISTS "Users can insert their own sonhos" ON sonhos;
DROP POLICY IF EXISTS "Users can update their own sonhos" ON sonhos;
DROP POLICY IF EXISTS "Users can delete their own sonhos" ON sonhos;

CREATE POLICY "Users can view their own sonhos"
  ON sonhos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sonhos"
  ON sonhos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sonhos"
  ON sonhos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sonhos"
  ON sonhos FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para sonhos_depositos
DROP POLICY IF EXISTS "Users can view their own sonhos_depositos" ON sonhos_depositos;
DROP POLICY IF EXISTS "Users can insert their own sonhos_depositos" ON sonhos_depositos;
DROP POLICY IF EXISTS "Users can update their own sonhos_depositos" ON sonhos_depositos;
DROP POLICY IF EXISTS "Users can delete their own sonhos_depositos" ON sonhos_depositos;

CREATE POLICY "Users can view their own sonhos_depositos"
  ON sonhos_depositos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sonhos_depositos"
  ON sonhos_depositos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sonhos_depositos"
  ON sonhos_depositos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sonhos_depositos"
  ON sonhos_depositos FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_sonhos_updated_at ON sonhos;
CREATE TRIGGER update_sonhos_updated_at BEFORE UPDATE ON sonhos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar valor_atual quando houver depósito
CREATE OR REPLACE FUNCTION atualizar_valor_atual_sonho()
RETURNS TRIGGER AS $$
DECLARE
  sonho_id_uuid UUID;
BEGIN
  -- Determinar o sonho_id baseado na operação
  IF TG_OP = 'DELETE' THEN
    sonho_id_uuid := OLD.sonho_id;
  ELSE
    sonho_id_uuid := NEW.sonho_id;
  END IF;

  -- Atualizar o valor_atual do sonho
  UPDATE sonhos
  SET valor_atual = (
    SELECT COALESCE(SUM(valor), 0)
    FROM sonhos_depositos
    WHERE sonho_id = sonho_id_uuid
  )
  WHERE id = sonho_id_uuid;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar valor_atual quando inserir/atualizar/deletar depósito
DROP TRIGGER IF EXISTS trigger_atualizar_valor_atual_sonho ON sonhos_depositos;
CREATE TRIGGER trigger_atualizar_valor_atual_sonho
  AFTER INSERT OR UPDATE OR DELETE ON sonhos_depositos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_valor_atual_sonho();
