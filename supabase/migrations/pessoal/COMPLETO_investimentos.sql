-- ============================================================================
-- SCRIPT COMPLETO: Criação da Tabela de Investimentos com todos os campos
-- Execute este script completo no SQL Editor do Supabase
-- ============================================================================

-- Remover tabela e políticas se já existirem (cuidado: isso apagará todos os dados!)
-- DROP TABLE IF EXISTS investimentos CASCADE;

-- ============================================================================
-- 1. CRIAR TABELA DE INVESTIMENTOS COMPLETA
-- ============================================================================

CREATE TABLE IF NOT EXISTS investimentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- Ex: Ações, FIIs, Tesouro Direto, CDB, etc.
  valor_investido DECIMAL(10, 2) NOT NULL,
  valor_atual DECIMAL(10, 2) NOT NULL,
  data_aquisicao DATE NOT NULL,
  quantidade DECIMAL(10, 4) DEFAULT 1,
  cotacao_aquisicao DECIMAL(10, 4),
  cotacao_atual DECIMAL(10, 4),
  -- Configurações para investimentos com rendimento fixo (CDB, LCI/LCA, etc.)
  taxa_juros DECIMAL(5, 2), -- Taxa de juros anual (ex: 12.5 para 12.5%)
  periodicidade TEXT, -- Quando o rendimento é liquidado (mensal, semestral, anual)
  data_proxima_liquidacao DATE, -- Data da próxima liquidação de rendimento
  liquidar_em_receitas BOOLEAN DEFAULT TRUE, -- Se o rendimento deve ser adicionado automaticamente às receitas
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CHECK (valor_investido >= 0),
  CHECK (valor_atual >= 0),
  CHECK (quantidade >= 0),
  CHECK (taxa_juros IS NULL OR taxa_juros >= 0),
  CHECK (periodicidade IS NULL OR periodicidade IN ('mensal', 'semestral', 'anual'))
);

-- ============================================================================
-- 2. ADICIONAR COLUNAS SE A TABELA JÁ EXISTIR (PARA TABELAS ANTIGAS)
-- ============================================================================

-- Adicionar campos de rendimento se não existirem
ALTER TABLE investimentos
  ADD COLUMN IF NOT EXISTS taxa_juros DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS periodicidade TEXT,
  ADD COLUMN IF NOT EXISTS data_proxima_liquidacao DATE,
  ADD COLUMN IF NOT EXISTS liquidar_em_receitas BOOLEAN DEFAULT TRUE;

-- ============================================================================
-- 3. CORRIGIR/ADICIONAR CONSTRAINTS
-- ============================================================================

-- Remover constraint antiga de periodicidade se existir incorretamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investimentos_periodicidade_check'
    AND conrelid = 'investimentos'::regclass
  ) THEN
    ALTER TABLE investimentos
      DROP CONSTRAINT investimentos_periodicidade_check;
  END IF;
END $$;

-- Adicionar constraint correta para periodicidade
DO $$
BEGIN
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
END $$;

-- ============================================================================
-- 4. CRIAR ÍNDICES PARA MELHOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_investimentos_user_id ON investimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_investimentos_data_aquisicao ON investimentos(data_aquisicao);
CREATE INDEX IF NOT EXISTS idx_investimentos_tipo ON investimentos(tipo);

-- Índice para data_proxima_liquidacao (criado APÓS a coluna existir)
CREATE INDEX IF NOT EXISTS idx_investimentos_data_proxima_liquidacao 
  ON investimentos(data_proxima_liquidacao)
  WHERE data_proxima_liquidacao IS NOT NULL;

-- ============================================================================
-- 5. FUNÇÃO PARA ATUALIZAR updated_at AUTOMATICAMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 6. TRIGGER PARA ATUALIZAR updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_investimentos_updated_at ON investimentos;

CREATE TRIGGER update_investimentos_updated_at 
  BEFORE UPDATE ON investimentos
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view their own investments" ON investimentos;
DROP POLICY IF EXISTS "Users can insert their own investments" ON investimentos;
DROP POLICY IF EXISTS "Users can update their own investments" ON investimentos;
DROP POLICY IF EXISTS "Users can delete their own investments" ON investimentos;

-- Política: Usuários só podem ver seus próprios investimentos
CREATE POLICY "Users can view their own investments"
  ON investimentos FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuários só podem inserir seus próprios investimentos
CREATE POLICY "Users can insert their own investments"
  ON investimentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários só podem atualizar seus próprios investimentos
CREATE POLICY "Users can update their own investments"
  ON investimentos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários só podem deletar seus próprios investimentos
CREATE POLICY "Users can delete their own investments"
  ON investimentos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
