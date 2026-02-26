-- ============================================================================
-- Migration 020: Permitir status 'free' em perfis (usuários isentos de pagamento)
-- ============================================================================
-- Para liberar acesso sem cobrança: defina subscription_status = 'free' no perfil.
-- ============================================================================

ALTER TABLE perfis
  DROP CONSTRAINT IF EXISTS perfis_subscription_status_check;
ALTER TABLE perfis
  ADD CONSTRAINT perfis_subscription_status_check
  CHECK (subscription_status IS NULL OR subscription_status IN ('trialing', 'active', 'expired', 'canceled', 'free'));

COMMENT ON COLUMN perfis.subscription_status IS 'trialing | active | expired | canceled | free (isentos de pagamento)';
