-- Migration 010: Adicionar campo dividend_yield para investimentos com cotação (Ações, FIIs, etc)
-- ============================================================================

-- Adicionar coluna dividend_yield se não existir
ALTER TABLE investimentos
  ADD COLUMN IF NOT EXISTS dividend_yield DECIMAL(5, 2);

-- Adicionar constraint para dividend_yield se não existir
DO $$
BEGIN
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
