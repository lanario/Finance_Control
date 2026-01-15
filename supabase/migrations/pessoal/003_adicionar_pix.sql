-- Adicionar suporte a PIX e outros métodos de pagamento

-- Tornar cartao_id opcional (permite NULL para PIX, dinheiro, etc)
ALTER TABLE compras 
  ALTER COLUMN cartao_id DROP NOT NULL;

-- Adicionar campo para método de pagamento
ALTER TABLE compras 
  ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'cartao';

-- Atualizar registros existentes para ter método 'cartao'
UPDATE compras 
SET metodo_pagamento = 'cartao' 
WHERE metodo_pagamento IS NULL AND cartao_id IS NOT NULL;

-- Adicionar constraint para valores válidos (DROP IF EXISTS para evitar erros se já existir)
ALTER TABLE compras 
  DROP CONSTRAINT IF EXISTS check_metodo_pagamento;

ALTER TABLE compras 
  ADD CONSTRAINT check_metodo_pagamento 
  CHECK (metodo_pagamento IN ('cartao', 'pix', 'dinheiro', 'debito'));

-- Índice para método de pagamento
CREATE INDEX IF NOT EXISTS idx_compras_metodo_pagamento ON compras(metodo_pagamento);
