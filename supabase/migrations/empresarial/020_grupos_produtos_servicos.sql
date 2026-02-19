-- Grupos de produtos e serviços (pastas para organizar itens)
-- Execute após as tabelas produtos e servicos existirem

-- Tabela de grupos de produtos
CREATE TABLE IF NOT EXISTS grupo_produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de grupos de serviços
CREATE TABLE IF NOT EXISTS grupo_servicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_grupo_produtos_user_id ON grupo_produtos(user_id);
CREATE INDEX IF NOT EXISTS idx_grupo_servicos_user_id ON grupo_servicos(user_id);

-- RLS
ALTER TABLE grupo_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own grupo_produtos" ON grupo_produtos;
DROP POLICY IF EXISTS "Users can insert their own grupo_produtos" ON grupo_produtos;
DROP POLICY IF EXISTS "Users can update their own grupo_produtos" ON grupo_produtos;
DROP POLICY IF EXISTS "Users can delete their own grupo_produtos" ON grupo_produtos;

CREATE POLICY "Users can view their own grupo_produtos"
  ON grupo_produtos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own grupo_produtos"
  ON grupo_produtos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own grupo_produtos"
  ON grupo_produtos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own grupo_produtos"
  ON grupo_produtos FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own grupo_servicos" ON grupo_servicos;
DROP POLICY IF EXISTS "Users can insert their own grupo_servicos" ON grupo_servicos;
DROP POLICY IF EXISTS "Users can update their own grupo_servicos" ON grupo_servicos;
DROP POLICY IF EXISTS "Users can delete their own grupo_servicos" ON grupo_servicos;

CREATE POLICY "Users can view their own grupo_servicos"
  ON grupo_servicos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own grupo_servicos"
  ON grupo_servicos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own grupo_servicos"
  ON grupo_servicos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own grupo_servicos"
  ON grupo_servicos FOR DELETE USING (auth.uid() = user_id);

-- Triggers updated_at
CREATE TRIGGER update_grupo_produtos_updated_at BEFORE UPDATE ON grupo_produtos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grupo_servicos_updated_at BEFORE UPDATE ON grupo_servicos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar FK em produtos e servicos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'grupo_produto_id') THEN
    ALTER TABLE produtos ADD COLUMN grupo_produto_id UUID REFERENCES grupo_produtos(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_produtos_grupo_produto_id ON produtos(grupo_produto_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'servicos' AND column_name = 'grupo_servico_id') THEN
    ALTER TABLE servicos ADD COLUMN grupo_servico_id UUID REFERENCES grupo_servicos(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_servicos_grupo_servico_id ON servicos(grupo_servico_id);
  END IF;
END $$;
