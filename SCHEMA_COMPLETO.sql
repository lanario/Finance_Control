-- ============================================================================
-- SCHEMA COMPLETO DO PROJETO FINANCEIRO PESSOAL
-- Execute este script completo no SQL Editor do Supabase
-- Este arquivo contém TODAS as migrations consolidadas
-- ============================================================================

-- ============================================================================
-- PARTE 1: FUNÇÕES GLOBAIS
-- ============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- PARTE 2: TABELA DE CARTÕES DE CRÉDITO
-- ============================================================================

CREATE TABLE IF NOT EXISTS cartoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  bandeira TEXT NOT NULL,
  limite DECIMAL(10, 2) NOT NULL,
  fechamento INTEGER NOT NULL CHECK (fechamento >= 1 AND fechamento <= 31),
  vencimento INTEGER NOT NULL CHECK (vencimento >= 1 AND vencimento <= 31),
  cor TEXT DEFAULT '#1e3a5f',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para cartões
CREATE INDEX IF NOT EXISTS idx_cartoes_user_id ON cartoes(user_id);

-- RLS para cartões
ALTER TABLE cartoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cartoes" ON cartoes;
DROP POLICY IF EXISTS "Users can insert their own cartoes" ON cartoes;
DROP POLICY IF EXISTS "Users can update their own cartoes" ON cartoes;
DROP POLICY IF EXISTS "Users can delete their own cartoes" ON cartoes;

CREATE POLICY "Users can view their own cartoes" ON cartoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cartoes" ON cartoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cartoes" ON cartoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cartoes" ON cartoes FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_cartoes_updated_at ON cartoes;
CREATE TRIGGER update_cartoes_updated_at BEFORE UPDATE ON cartoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PARTE 3: TABELA DE COMPRAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS compras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data DATE NOT NULL,
  categoria TEXT NOT NULL,
  metodo_pagamento TEXT DEFAULT 'cartao',
  parcelada BOOLEAN DEFAULT FALSE,
  total_parcelas INTEGER CHECK (total_parcelas >= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CHECK (metodo_pagamento IN ('cartao', 'pix', 'dinheiro', 'debito'))
);

-- Índices para compras
CREATE INDEX IF NOT EXISTS idx_compras_user_id ON compras(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_cartao_id ON compras(cartao_id);
CREATE INDEX IF NOT EXISTS idx_compras_data ON compras(data);
CREATE INDEX IF NOT EXISTS idx_compras_categoria ON compras(categoria);
CREATE INDEX IF NOT EXISTS idx_compras_metodo_pagamento ON compras(metodo_pagamento);

-- RLS para compras
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own compras" ON compras;
DROP POLICY IF EXISTS "Users can insert their own compras" ON compras;
DROP POLICY IF EXISTS "Users can update their own compras" ON compras;
DROP POLICY IF EXISTS "Users can delete their own compras" ON compras;

CREATE POLICY "Users can view their own compras" ON compras FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own compras" ON compras FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own compras" ON compras FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own compras" ON compras FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_compras_updated_at ON compras;
CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON compras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PARTE 4: TABELA DE TIPOS DE GASTOS
-- ============================================================================

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

-- Índices para tipos_gastos
CREATE INDEX IF NOT EXISTS idx_tipos_gastos_user_id ON tipos_gastos(user_id);

-- RLS para tipos_gastos
ALTER TABLE tipos_gastos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tipos_gastos" ON tipos_gastos;
DROP POLICY IF EXISTS "Users can insert their own tipos_gastos" ON tipos_gastos;
DROP POLICY IF EXISTS "Users can update their own tipos_gastos" ON tipos_gastos;
DROP POLICY IF EXISTS "Users can delete their own tipos_gastos" ON tipos_gastos;

CREATE POLICY "Users can view their own tipos_gastos" ON tipos_gastos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tipos_gastos" ON tipos_gastos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tipos_gastos" ON tipos_gastos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tipos_gastos" ON tipos_gastos FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_tipos_gastos_updated_at ON tipos_gastos;
CREATE TRIGGER update_tipos_gastos_updated_at BEFORE UPDATE ON tipos_gastos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PARTE 5: TABELA DE RECEITAS
-- ============================================================================

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

-- Índices para receitas
CREATE INDEX IF NOT EXISTS idx_receitas_user_id ON receitas(user_id);
CREATE INDEX IF NOT EXISTS idx_receitas_data ON receitas(data);
CREATE INDEX IF NOT EXISTS idx_receitas_mes_ano ON receitas(ano_referencia, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_receitas_tipo ON receitas(tipo);

-- RLS para receitas
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own receitas" ON receitas;
DROP POLICY IF EXISTS "Users can insert their own receitas" ON receitas;
DROP POLICY IF EXISTS "Users can update their own receitas" ON receitas;
DROP POLICY IF EXISTS "Users can delete their own receitas" ON receitas;

CREATE POLICY "Users can view their own receitas" ON receitas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own receitas" ON receitas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own receitas" ON receitas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own receitas" ON receitas FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_receitas_updated_at ON receitas;
CREATE TRIGGER update_receitas_updated_at BEFORE UPDATE ON receitas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PARTE 6: TABELA DE FATURAS PAGAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS faturas_pagas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia >= 1 AND mes_referencia <= 12),
  ano_referencia INTEGER NOT NULL,
  data_pagamento DATE NOT NULL,
  total_pago DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(cartao_id, mes_referencia, ano_referencia)
);

-- Índices para faturas_pagas
CREATE INDEX IF NOT EXISTS idx_faturas_pagas_cartao_id ON faturas_pagas(cartao_id);
CREATE INDEX IF NOT EXISTS idx_faturas_pagas_user_id ON faturas_pagas(user_id);
CREATE INDEX IF NOT EXISTS idx_faturas_pagas_data ON faturas_pagas(data_pagamento);

-- RLS para faturas_pagas
ALTER TABLE faturas_pagas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own faturas_pagas" ON faturas_pagas;
DROP POLICY IF EXISTS "Users can insert their own faturas_pagas" ON faturas_pagas;
DROP POLICY IF EXISTS "Users can update their own faturas_pagas" ON faturas_pagas;
DROP POLICY IF EXISTS "Users can delete their own faturas_pagas" ON faturas_pagas;

CREATE POLICY "Users can view their own faturas_pagas" ON faturas_pagas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own faturas_pagas" ON faturas_pagas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own faturas_pagas" ON faturas_pagas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own faturas_pagas" ON faturas_pagas FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PARTE 7: TABELA DE PARCELAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS parcelas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compra_id UUID REFERENCES compras(id) ON DELETE CASCADE,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  numero_parcela INTEGER NOT NULL CHECK (numero_parcela >= 1),
  total_parcelas INTEGER NOT NULL CHECK (total_parcelas >= 1),
  data_vencimento DATE NOT NULL,
  categoria TEXT NOT NULL,
  paga BOOLEAN DEFAULT FALSE,
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CHECK (numero_parcela <= total_parcelas)
);

-- Índices para parcelas
CREATE INDEX IF NOT EXISTS idx_parcelas_user_id ON parcelas(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_compra_id ON parcelas(compra_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_cartao_id ON parcelas(cartao_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_data_vencimento ON parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_paga ON parcelas(paga);

-- RLS para parcelas
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own parcelas" ON parcelas;
DROP POLICY IF EXISTS "Users can insert their own parcelas" ON parcelas;
DROP POLICY IF EXISTS "Users can update their own parcelas" ON parcelas;
DROP POLICY IF EXISTS "Users can delete their own parcelas" ON parcelas;

CREATE POLICY "Users can view their own parcelas" ON parcelas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own parcelas" ON parcelas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own parcelas" ON parcelas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own parcelas" ON parcelas FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_parcelas_updated_at ON parcelas;
CREATE TRIGGER update_parcelas_updated_at BEFORE UPDATE ON parcelas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PARTE 8: TABELA DE INVESTIMENTOS (CORRIGIDA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS investimentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  valor_investido DECIMAL(10, 2) NOT NULL,
  valor_atual DECIMAL(10, 2) NOT NULL,
  data_aquisicao DATE NOT NULL,
  quantidade DECIMAL(10, 4) DEFAULT 1,
  cotacao_aquisicao DECIMAL(10, 4),
  cotacao_atual DECIMAL(10, 4),
  taxa_juros DECIMAL(5, 2),
  periodicidade TEXT,
  data_proxima_liquidacao DATE,
  liquidar_em_receitas BOOLEAN DEFAULT TRUE,
  dividend_yield DECIMAL(5, 2),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CHECK (valor_investido >= 0),
  CHECK (valor_atual >= 0),
  CHECK (quantidade >= 0),
  CHECK (taxa_juros IS NULL OR taxa_juros >= 0),
  CHECK (periodicidade IS NULL OR periodicidade IN ('mensal', 'semestral', 'anual')),
  CHECK (dividend_yield IS NULL OR dividend_yield >= 0)
);

-- Adicionar colunas se a tabela já existir sem elas
ALTER TABLE investimentos
  ADD COLUMN IF NOT EXISTS taxa_juros DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS periodicidade TEXT,
  ADD COLUMN IF NOT EXISTS data_proxima_liquidacao DATE,
  ADD COLUMN IF NOT EXISTS liquidar_em_receitas BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS dividend_yield DECIMAL(5, 2);

-- Corrigir constraints de periodicidade se necessário
DO $$
BEGIN
  -- Remover constraint antiga se existir incorretamente
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investimentos_periodicidade_check'
    AND conrelid = 'investimentos'::regclass
  ) THEN
    ALTER TABLE investimentos DROP CONSTRAINT investimentos_periodicidade_check;
  END IF;
  
  -- Adicionar constraint correta
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investimentos_periodicidade_check'
    AND conrelid = 'investimentos'::regclass
  ) THEN
    ALTER TABLE investimentos
      ADD CONSTRAINT investimentos_periodicidade_check 
      CHECK (periodicidade IS NULL OR periodicidade IN ('mensal', 'semestral', 'anual'));
  END IF;
  
  -- Adicionar constraint para taxa_juros se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investimentos_taxa_juros_check'
    AND conrelid = 'investimentos'::regclass
  ) THEN
    ALTER TABLE investimentos
      ADD CONSTRAINT investimentos_taxa_juros_check 
      CHECK (taxa_juros IS NULL OR taxa_juros >= 0);
  END IF;
  
  -- Adicionar constraint para dividend_yield se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investimentos_dividend_yield_check'
    AND conrelid = 'investimentos'::regclass
  ) THEN
    ALTER TABLE investimentos
      ADD CONSTRAINT investimentos_dividend_yield_check 
      CHECK (dividend_yield IS NULL OR dividend_yield >= 0);
  END IF;
END $$;

-- Índices para investimentos (criar APÓS garantir que as colunas existem)
CREATE INDEX IF NOT EXISTS idx_investimentos_user_id ON investimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_investimentos_data_aquisicao ON investimentos(data_aquisicao);
CREATE INDEX IF NOT EXISTS idx_investimentos_tipo ON investimentos(tipo);

-- Índice para data_proxima_liquidacao (apenas se a coluna existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investimentos' 
    AND column_name = 'data_proxima_liquidacao'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_investimentos_data_proxima_liquidacao 
      ON investimentos(data_proxima_liquidacao)
      WHERE data_proxima_liquidacao IS NOT NULL;
  END IF;
END $$;

-- RLS para investimentos
ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own investments" ON investimentos;
DROP POLICY IF EXISTS "Users can insert their own investments" ON investimentos;
DROP POLICY IF EXISTS "Users can update their own investments" ON investimentos;
DROP POLICY IF EXISTS "Users can delete their own investments" ON investimentos;

CREATE POLICY "Users can view their own investments" ON investimentos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own investments" ON investimentos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own investments" ON investimentos FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own investments" ON investimentos FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_investimentos_updated_at ON investimentos;
CREATE TRIGGER update_investimentos_updated_at BEFORE UPDATE ON investimentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FIM DO SCRIPT COMPLETO
-- ============================================================================
