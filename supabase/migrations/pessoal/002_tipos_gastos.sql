-- Tabela de tipos de gastos personalizados
CREATE TABLE IF NOT EXISTS tipos_gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#6b7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, nome)
);

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_tipos_gastos_user_id ON tipos_gastos(user_id);

-- RLS (Row Level Security) Policies
ALTER TABLE tipos_gastos ENABLE ROW LEVEL SECURITY;

-- Políticas para tipos_gastos (DROP IF EXISTS para evitar erros se já existirem)
DROP POLICY IF EXISTS "Users can view their own tipos_gastos" ON tipos_gastos;
DROP POLICY IF EXISTS "Users can insert their own tipos_gastos" ON tipos_gastos;
DROP POLICY IF EXISTS "Users can update their own tipos_gastos" ON tipos_gastos;
DROP POLICY IF EXISTS "Users can delete their own tipos_gastos" ON tipos_gastos;

CREATE POLICY "Users can view their own tipos_gastos"
  ON tipos_gastos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tipos_gastos"
  ON tipos_gastos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tipos_gastos"
  ON tipos_gastos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tipos_gastos"
  ON tipos_gastos FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_tipos_gastos_updated_at ON tipos_gastos;

CREATE TRIGGER update_tipos_gastos_updated_at BEFORE UPDATE ON tipos_gastos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
