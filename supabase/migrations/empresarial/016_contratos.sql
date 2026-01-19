-- Tabela de contratos (receitas fixas mensais)
CREATE TABLE IF NOT EXISTS contratos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  nome_contrato TEXT NOT NULL,
  descricao TEXT,
  valor_mensal DECIMAL(10, 2) NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE, -- NULL = contrato sem data de término
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31), -- Dia do mês em que vence
  forma_recebimento TEXT CHECK (forma_recebimento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')) DEFAULT 'pix',
  observacoes TEXT,
  detalhes_contrato TEXT, -- Detalhes adicionais do contrato
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela para rastrear quais meses já foram gerados para cada contrato
CREATE TABLE IF NOT EXISTS contratos_receitas_geradas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  conta_receber_id UUID REFERENCES contas_a_receber(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(contrato_id, ano, mes)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contratos_user_id ON contratos(user_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente_id ON contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_ativo ON contratos(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_contratos_receitas_geradas_contrato_id ON contratos_receitas_geradas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contratos_receitas_geradas_ano_mes ON contratos_receitas_geradas(ano, mes);

-- RLS (Row Level Security) Policies
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_receitas_geradas ENABLE ROW LEVEL SECURITY;

-- Políticas para contratos
DROP POLICY IF EXISTS "Users can view their own contratos" ON contratos;
DROP POLICY IF EXISTS "Users can insert their own contratos" ON contratos;
DROP POLICY IF EXISTS "Users can update their own contratos" ON contratos;
DROP POLICY IF EXISTS "Users can delete their own contratos" ON contratos;

CREATE POLICY "Users can view their own contratos"
  ON contratos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contratos"
  ON contratos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contratos"
  ON contratos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contratos"
  ON contratos FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para contratos_receitas_geradas
DROP POLICY IF EXISTS "Users can view their own contratos_receitas_geradas" ON contratos_receitas_geradas;
DROP POLICY IF EXISTS "Users can insert their own contratos_receitas_geradas" ON contratos_receitas_geradas;
DROP POLICY IF EXISTS "Users can update their own contratos_receitas_geradas" ON contratos_receitas_geradas;
DROP POLICY IF EXISTS "Users can delete their own contratos_receitas_geradas" ON contratos_receitas_geradas;

CREATE POLICY "Users can view their own contratos_receitas_geradas"
  ON contratos_receitas_geradas FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM contratos WHERE id = contrato_id));

CREATE POLICY "Users can insert their own contratos_receitas_geradas"
  ON contratos_receitas_geradas FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM contratos WHERE id = contrato_id));

CREATE POLICY "Users can update their own contratos_receitas_geradas"
  ON contratos_receitas_geradas FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM contratos WHERE id = contrato_id));

CREATE POLICY "Users can delete their own contratos_receitas_geradas"
  ON contratos_receitas_geradas FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM contratos WHERE id = contrato_id));

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_contratos_updated_at ON contratos;
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON contratos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

