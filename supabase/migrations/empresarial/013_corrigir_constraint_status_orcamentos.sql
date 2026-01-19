-- ============================================================================
-- MIGRAÇÃO: Corrigir constraint de status de orçamentos (execução rápida)
-- ============================================================================
-- Execute este SQL no SQL Editor do Supabase Empresarial
-- ============================================================================

-- Primeiro, migrar os dados existentes (se houver valores antigos)
UPDATE orcamentos
SET status = CASE
  WHEN status IN ('rascunho', 'enviado', 'aprovado') THEN 'em_processo'
  WHEN status = 'rejeitado' THEN 'cancelado'
  WHEN status = 'convertido' THEN 'concluido'
  ELSE status
END
WHERE status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado', 'convertido');

-- Remover a constraint antiga (se existir)
ALTER TABLE orcamentos
DROP CONSTRAINT IF EXISTS orcamentos_status_check;

-- Adicionar a nova constraint com os status corretos
ALTER TABLE orcamentos
ADD CONSTRAINT orcamentos_status_check 
CHECK (status IN ('concluido', 'em_processo', 'cancelado'));

-- Atualizar o valor padrão (garantir que está correto)
ALTER TABLE orcamentos
ALTER COLUMN status SET DEFAULT 'em_processo';

-- ============================================================================
-- NOTA: Após executar este SQL, o problema de constraint violation será resolvido
-- ============================================================================

