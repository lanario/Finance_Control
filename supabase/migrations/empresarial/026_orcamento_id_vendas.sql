-- ============================================================================
-- Migration 026: venda originada de orçamento concluído
-- ============================================================================
-- Adiciona orcamento_id em vendas para vincular venda criada ao marcar
-- orçamento como concluído (venda criada com status pendente).
-- ============================================================================

ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS orcamento_id UUID REFERENCES orcamentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendas_orcamento_id ON vendas(orcamento_id) WHERE orcamento_id IS NOT NULL;

COMMENT ON COLUMN vendas.orcamento_id IS 'Orçamento que originou esta venda (quando status do orçamento foi alterado para concluído)';
