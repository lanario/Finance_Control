-- Adiciona campos de snapshot do cliente em orcamentos (CPF, CNPJ, Razão Social)
-- Só altera se a tabela orcamentos existir (evita erro se esta migration rodar antes da 007)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orcamentos'
  ) THEN
    ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS cliente_cpf TEXT;
    ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS cliente_cnpj TEXT;
    ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS cliente_razao_social TEXT;
  END IF;
END $$;
