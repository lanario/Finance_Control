-- ============================================================================
-- MIGRAÇÃO: Atualizar status de orçamentos
-- ============================================================================
-- 
-- PROBLEMA: Os status antigos (rascunho, enviado, aprovado, rejeitado, convertido)
-- precisam ser atualizados para os novos status: concluido, em_processo, cancelado
--
-- SOLUÇÃO: 
-- 1. Atualizar a constraint CHECK da coluna status
-- 2. Migrar os dados existentes:
--    - rascunho, enviado, aprovado -> em_processo
--    - rejeitado -> cancelado
--    - convertido -> concluido
-- ============================================================================

-- Primeiro, migrar os dados existentes
UPDATE orcamentos
SET status = CASE
  WHEN status IN ('rascunho', 'enviado', 'aprovado') THEN 'em_processo'
  WHEN status = 'rejeitado' THEN 'cancelado'
  WHEN status = 'convertido' THEN 'concluido'
  ELSE 'em_processo'
END
WHERE status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado', 'convertido');

-- Remover a constraint antiga
ALTER TABLE orcamentos
DROP CONSTRAINT IF EXISTS orcamentos_status_check;

-- Adicionar a nova constraint com os novos status
ALTER TABLE orcamentos
ADD CONSTRAINT orcamentos_status_check 
CHECK (status IN ('concluido', 'em_processo', 'cancelado'));

-- Atualizar o valor padrão
ALTER TABLE orcamentos
ALTER COLUMN status SET DEFAULT 'em_processo';

