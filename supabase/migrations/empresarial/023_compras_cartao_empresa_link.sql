-- Vincular compras (Compras/Despesas) ao cartão da empresa quando forma_pagamento = cartao_credito
-- e permitir que compras criadas na aba Cartão Empresa apareçam em Compras/Despesas

-- 1) compras: coluna opcional para o cartão usado
ALTER TABLE compras
  ADD COLUMN IF NOT EXISTS cartao_empresa_id UUID REFERENCES cartoes_empresa(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_compras_cartao_empresa_id ON compras(cartao_empresa_id);

-- 2) compras_cartao_empresa: vínculo opcional com a compra (quando criada a partir de Compras/Despesas)
ALTER TABLE compras_cartao_empresa
  ADD COLUMN IF NOT EXISTS compra_id UUID REFERENCES compras(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_compras_cartao_empresa_compra_id ON compras_cartao_empresa(compra_id);
