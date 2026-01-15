-- Adicionar campos faltantes na tabela perfis
ALTER TABLE perfis
ADD COLUMN IF NOT EXISTS celular TEXT,
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS logo_empresa_url TEXT;
