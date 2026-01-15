-- Migration: Adicionar campos de rendimento aos investimentos
-- Created: 2025-01-XX

-- Adicionar campos para investimentos com rendimento fixo (apenas se não existirem)
ALTER TABLE investimentos
  ADD COLUMN IF NOT EXISTS taxa_juros DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS periodicidade TEXT,
  ADD COLUMN IF NOT EXISTS data_proxima_liquidacao DATE,
  ADD COLUMN IF NOT EXISTS liquidar_em_receitas BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS dividend_yield DECIMAL(5, 2);

-- Adicionar constraints apenas se as colunas forem criadas agora
DO $$
BEGIN
  -- Adicionar constraint para taxa_juros se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investimentos_taxa_juros_check'
  ) THEN
    ALTER TABLE investimentos
      ADD CONSTRAINT investimentos_taxa_juros_check 
      CHECK (taxa_juros IS NULL OR taxa_juros >= 0);
  END IF;

  -- Adicionar constraint para dividend_yield se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investimentos_dividend_yield_check'
  ) THEN
    ALTER TABLE investimentos
      ADD CONSTRAINT investimentos_dividend_yield_check 
      CHECK (dividend_yield IS NULL OR dividend_yield >= 0);
  END IF;

  -- Adicionar constraint para periodicidade se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investimentos_periodicidade_check'
  ) THEN
    ALTER TABLE investimentos
      ADD CONSTRAINT investimentos_periodicidade_check 
      CHECK (periodicidade IS NULL OR periodicidade IN ('mensal', 'semestral', 'anual'));
  END IF;
END $$;

-- Índice para busca por data de próxima liquidação
CREATE INDEX IF NOT EXISTS idx_investimentos_data_proxima_liquidacao ON investimentos(data_proxima_liquidacao)
WHERE data_proxima_liquidacao IS NOT NULL;
