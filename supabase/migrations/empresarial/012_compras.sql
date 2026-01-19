-- Tabela de compras empresariais
CREATE TABLE IF NOT EXISTS compras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL,
  valor_desconto DECIMAL(10, 2) DEFAULT 0,
  valor_final DECIMAL(10, 2) NOT NULL,
  data_compra DATE NOT NULL,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito', 'parcelado')),
  status TEXT DEFAULT 'em_andamento' CHECK (status IN ('finalizado', 'em_andamento', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_compras_user_id ON compras(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_fornecedor_id ON compras(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_categoria_id ON compras(categoria_id);
CREATE INDEX IF NOT EXISTS idx_compras_status ON compras(status);
CREATE INDEX IF NOT EXISTS idx_compras_data_compra ON compras(data_compra);

-- RLS (Row Level Security) Policies
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;

-- Políticas para compras
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

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_compras_updated_at ON compras;

CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON compras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

