-- Migration: Corrigir constraint de periodicidade na tabela investimentos
-- Created: 2025-01-XX

-- Remover constraint antiga se existir (caso tenha sido criada incorretamente)
DO $$
BEGIN
  -- Tentar remover constraint antiga se existir
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investimentos_periodicidade_check'
    AND conrelid = 'investimentos'::regclass
  ) THEN
    ALTER TABLE investimentos
      DROP CONSTRAINT investimentos_periodicidade_check;
  END IF;
  
  -- Remover qualquer constraint inline na definição da coluna (se existir)
  -- Isso pode não funcionar diretamente, então vamos garantir que a constraint seja adicionada corretamente
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
END $$;
