-- Tabela de contas a receber
CREATE TABLE IF NOT EXISTS contas_a_receber (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  recebida BOOLEAN DEFAULT false,
  forma_recebimento TEXT CHECK (forma_recebimento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')),
  observacoes TEXT,
  parcelada BOOLEAN DEFAULT false,
  total_parcelas INTEGER DEFAULT 1,
  parcela_atual INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de parcelas de contas a receber
CREATE TABLE IF NOT EXISTS parcelas_contas_receber (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_receber_id UUID NOT NULL REFERENCES contas_a_receber(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  recebida BOOLEAN DEFAULT false,
  forma_recebimento TEXT CHECK (forma_recebimento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')),
  parcela_numero INTEGER NOT NULL,
  total_parcelas INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_user_id ON contas_a_receber(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_cliente_id ON contas_a_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_categoria_id ON contas_a_receber(categoria_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_data_vencimento ON contas_a_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_recebida ON contas_a_receber(recebida);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_user_id ON parcelas_contas_receber(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_conta_receber_id ON parcelas_contas_receber(conta_receber_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_data_vencimento ON parcelas_contas_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_recebida ON parcelas_contas_receber(recebida);

-- RLS (Row Level Security) Policies
ALTER TABLE contas_a_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_contas_receber ENABLE ROW LEVEL SECURITY;

-- Políticas para contas_a_receber
DROP POLICY IF EXISTS "Users can view their own contas_a_receber" ON contas_a_receber;
DROP POLICY IF EXISTS "Users can insert their own contas_a_receber" ON contas_a_receber;
DROP POLICY IF EXISTS "Users can update their own contas_a_receber" ON contas_a_receber;
DROP POLICY IF EXISTS "Users can delete their own contas_a_receber" ON contas_a_receber;

CREATE POLICY "Users can view their own contas_a_receber"
  ON contas_a_receber FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contas_a_receber"
  ON contas_a_receber FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contas_a_receber"
  ON contas_a_receber FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contas_a_receber"
  ON contas_a_receber FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para parcelas_contas_receber
DROP POLICY IF EXISTS "Users can view their own parcelas_contas_receber" ON parcelas_contas_receber;
DROP POLICY IF EXISTS "Users can insert their own parcelas_contas_receber" ON parcelas_contas_receber;
DROP POLICY IF EXISTS "Users can update their own parcelas_contas_receber" ON parcelas_contas_receber;
DROP POLICY IF EXISTS "Users can delete their own parcelas_contas_receber" ON parcelas_contas_receber;

CREATE POLICY "Users can view their own parcelas_contas_receber"
  ON parcelas_contas_receber FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parcelas_contas_receber"
  ON parcelas_contas_receber FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parcelas_contas_receber"
  ON parcelas_contas_receber FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parcelas_contas_receber"
  ON parcelas_contas_receber FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_contas_a_receber_updated_at ON contas_a_receber;
DROP TRIGGER IF EXISTS update_parcelas_contas_receber_updated_at ON parcelas_contas_receber;

CREATE TRIGGER update_contas_a_receber_updated_at BEFORE UPDATE ON contas_a_receber
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcelas_contas_receber_updated_at BEFORE UPDATE ON parcelas_contas_receber
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
