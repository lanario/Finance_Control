-- Itens da compra: vincular compras a produtos existentes (opcional)
-- Ao finalizar a compra, o estoque dos produtos é atualizado (entrada)
-- Só cria a tabela se compras e produtos existirem (evita 42P01)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'compras')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos') THEN
    CREATE TABLE IF NOT EXISTS compras_itens (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
      produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      quantidade DECIMAL(10, 3) NOT NULL DEFAULT 1,
      preco_unitario DECIMAL(10, 2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_compras_itens_compra_id ON compras_itens(compra_id);
    CREATE INDEX IF NOT EXISTS idx_compras_itens_produto_id ON compras_itens(produto_id);
    ALTER TABLE compras_itens ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view compras_itens of their compras" ON compras_itens;
    CREATE POLICY "Users can view compras_itens of their compras"
      ON compras_itens FOR SELECT
      USING (EXISTS (SELECT 1 FROM compras WHERE compras.id = compras_itens.compra_id AND compras.user_id = auth.uid()));
    DROP POLICY IF EXISTS "Users can insert compras_itens for their compras" ON compras_itens;
    CREATE POLICY "Users can insert compras_itens for their compras"
      ON compras_itens FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM compras WHERE compras.id = compras_itens.compra_id AND compras.user_id = auth.uid()));
    DROP POLICY IF EXISTS "Users can update compras_itens of their compras" ON compras_itens;
    CREATE POLICY "Users can update compras_itens of their compras"
      ON compras_itens FOR UPDATE
      USING (EXISTS (SELECT 1 FROM compras WHERE compras.id = compras_itens.compra_id AND compras.user_id = auth.uid()));
    DROP POLICY IF EXISTS "Users can delete compras_itens of their compras" ON compras_itens;
    CREATE POLICY "Users can delete compras_itens of their compras"
      ON compras_itens FOR DELETE
      USING (EXISTS (SELECT 1 FROM compras WHERE compras.id = compras_itens.compra_id AND compras.user_id = auth.uid()));
  END IF;
END $$;
