-- Campos usados pelo app Produtos/Serviços que podem não existir no schema inicial
-- Execute no SQL Editor do Supabase se o insert de produto/serviço falhar

DO $$
BEGIN
  -- Produtos: preco_custo e foto_url (app usa foto_url; schema pode ter apenas imagem_url)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'preco_custo') THEN
    ALTER TABLE produtos ADD COLUMN preco_custo DECIMAL(10, 2) DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'foto_url') THEN
    ALTER TABLE produtos ADD COLUMN foto_url TEXT DEFAULT NULL;
  END IF;

  -- Serviços: foto_url (app usa foto_url)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'servicos' AND column_name = 'foto_url') THEN
    ALTER TABLE servicos ADD COLUMN foto_url TEXT DEFAULT NULL;
  END IF;
END $$;
