-- ============================================================================
-- Migration 019: Colunas de assinatura Stripe na tabela perfis (pessoal)
-- ============================================================================
-- Trial de 24h a partir de created_at; após isso exige pagamento.
-- Status: 'trialing' (dentro das 24h), 'active' (pago), 'expired' | 'canceled'.
-- ============================================================================

-- Colunas de assinatura
ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Constraint: status deve ser um dos valores esperados
ALTER TABLE perfis
  DROP CONSTRAINT IF EXISTS perfis_subscription_status_check;
ALTER TABLE perfis
  ADD CONSTRAINT perfis_subscription_status_check
  CHECK (subscription_status IS NULL OR subscription_status IN ('trialing', 'active', 'expired', 'canceled', 'free'));

-- Índices para buscas por Stripe (webhooks)
CREATE INDEX IF NOT EXISTS idx_perfis_stripe_customer_id ON perfis(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_perfis_stripe_subscription_id ON perfis(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Backfill: perfis existentes ganham trial_ends_at = created_at + 24h
UPDATE perfis
SET trial_ends_at = created_at + INTERVAL '24 hours'
WHERE trial_ends_at IS NULL;

-- Função: ao inserir novo perfil, definir trial_ends_at = created_at + 24h
CREATE OR REPLACE FUNCTION set_trial_ends_at_on_perfil_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NEW.created_at + INTERVAL '24 hours';
  END IF;
  IF NEW.subscription_status IS NULL THEN
    NEW.subscription_status := 'trialing';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_trial_ends_at_perfis ON perfis;
CREATE TRIGGER set_trial_ends_at_perfis
  BEFORE INSERT ON perfis
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_ends_at_on_perfil_insert();

-- Comentários para documentação
COMMENT ON COLUMN perfis.trial_ends_at IS 'Fim do período de degustação (24h após created_at)';
COMMENT ON COLUMN perfis.subscription_status IS 'trialing | active | expired | canceled | free (isentos de pagamento)';
COMMENT ON COLUMN perfis.stripe_customer_id IS 'ID do cliente no Stripe';
COMMENT ON COLUMN perfis.stripe_subscription_id IS 'ID da assinatura no Stripe';


UPDATE perfis
SET stripe_customer_id = NULL
WHERE stripe_customer_id = 'cus_U2tNTClJXWtQ5z';