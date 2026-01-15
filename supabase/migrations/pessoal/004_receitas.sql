-- Tabela de receitas
CREATE TABLE IF NOT EXISTS receitas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('fixa', 'extra')),
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia >= 1 AND mes_referencia <= 12),
  ano_referencia INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_receitas_user_id ON receitas(user_id);
CREATE INDEX IF NOT EXISTS idx_receitas_data ON receitas(data);
CREATE INDEX IF NOT EXISTS idx_receitas_mes_ano ON receitas(ano_referencia, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_receitas_tipo ON receitas(tipo);

-- RLS (Row Level Security) Policies
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;

-- Políticas para receitas (DROP IF EXISTS para evitar erros se já existirem)
DROP POLICY IF EXISTS "Users can view their own receitas" ON receitas;
DROP POLICY IF EXISTS "Users can insert their own receitas" ON receitas;
DROP POLICY IF EXISTS "Users can update their own receitas" ON receitas;
DROP POLICY IF EXISTS "Users can delete their own receitas" ON receitas;

CREATE POLICY "Users can view their own receitas"
  ON receitas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receitas"
  ON receitas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receitas"
  ON receitas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receitas"
  ON receitas FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_receitas_updated_at ON receitas;

CREATE TRIGGER update_receitas_updated_at BEFORE UPDATE ON receitas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
