-- Tabela de cartões de crédito
CREATE TABLE IF NOT EXISTS cartoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  bandeira TEXT NOT NULL,
  limite DECIMAL(10, 2) NOT NULL,
  fechamento INTEGER NOT NULL CHECK (fechamento >= 1 AND fechamento <= 31),
  vencimento INTEGER NOT NULL CHECK (vencimento >= 1 AND vencimento <= 31),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de compras
CREATE TABLE IF NOT EXISTS compras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data DATE NOT NULL,
  categoria TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_cartoes_user_id ON cartoes(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_user_id ON compras(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_cartao_id ON compras(cartao_id);
CREATE INDEX IF NOT EXISTS idx_compras_data ON compras(data);
CREATE INDEX IF NOT EXISTS idx_compras_categoria ON compras(categoria);

-- RLS (Row Level Security) Policies
ALTER TABLE cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;

-- Políticas para cartões (DROP IF EXISTS para evitar erros se já existirem)
DROP POLICY IF EXISTS "Users can view their own cartoes" ON cartoes;
DROP POLICY IF EXISTS "Users can insert their own cartoes" ON cartoes;
DROP POLICY IF EXISTS "Users can update their own cartoes" ON cartoes;
DROP POLICY IF EXISTS "Users can delete their own cartoes" ON cartoes;

CREATE POLICY "Users can view their own cartoes"
  ON cartoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cartoes"
  ON cartoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cartoes"
  ON cartoes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cartoes"
  ON cartoes FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para compras (DROP IF EXISTS para evitar erros se já existirem)
DROP POLICY IF EXISTS "Users can view their own compras" ON compras;
DROP POLICY IF EXISTS "Users can insert their own compras" ON compras;
DROP POLICY IF EXISTS "Users can update their own compras" ON compras;
DROP POLICY IF EXISTS "Users can delete their own compras" ON compras;

CREATE POLICY "Users can view their own compras"
  ON compras FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own compras"
  ON compras FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compras"
  ON compras FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own compras"
  ON compras FOR DELETE
  USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at (DROP IF EXISTS para evitar erros se já existirem)
DROP TRIGGER IF EXISTS update_cartoes_updated_at ON cartoes;
DROP TRIGGER IF EXISTS update_compras_updated_at ON compras;

CREATE TRIGGER update_cartoes_updated_at BEFORE UPDATE ON cartoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON compras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

