-- Gerenciamento de estoque em produtos e vínculo custo da venda em contas a pagar
-- 1) Produtos: garantir campos estoque e estoque_minimo (só se a tabela produtos existir)
-- 2) Contas a pagar: venda_id para despesa de custo da venda (rastrear e reverter ao cancelar)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'estoque') THEN
      ALTER TABLE produtos ADD COLUMN estoque DECIMAL(10, 3) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'estoque_minimo') THEN
      ALTER TABLE produtos ADD COLUMN estoque_minimo DECIMAL(10, 3) DEFAULT 0;
    END IF;
  END IF;
END $$;

-- Índice para alertas de estoque baixo (apenas se a tabela produtos existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos') THEN
    CREATE INDEX IF NOT EXISTS idx_produtos_estoque_baixo
      ON produtos(user_id, estoque, estoque_minimo)
      WHERE ativo = true AND estoque_minimo > 0;
  END IF;
END $$;

-- Contas a pagar: venda_id para despesa gerada pela venda de produto (custo)
-- Só altera se a tabela contas_a_pagar existir (ex.: migração 002 já aplicada)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contas_a_pagar') THEN
    ALTER TABLE contas_a_pagar
      ADD COLUMN IF NOT EXISTS venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_venda_id ON contas_a_pagar(venda_id) WHERE venda_id IS NOT NULL;
  END IF;
END $$;
