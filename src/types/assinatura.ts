/** Status da assinatura no banco (perfis.subscription_status). */
export type SubscriptionStatus = 'trialing' | 'active' | 'expired' | 'canceled' | 'free'

export interface PerfilAssinatura {
  trial_ends_at: string | null
  subscription_status: SubscriptionStatus | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
}

/** Indica se o usuário tem acesso (trial vigente, assinatura ativa ou isento/free). */
export function hasAccess(perfil: PerfilAssinatura | null): boolean {
  if (!perfil) return false
  if (perfil.subscription_status === 'free') return true
  const now = new Date()
  const trialEnd = perfil.trial_ends_at ? new Date(perfil.trial_ends_at) : null
  const inTrial = trialEnd ? now < trialEnd : false
  const isActive = perfil.subscription_status === 'active'
  return inTrial || isActive
}

/** Indica se o usuário está isento de pagamento (não vê timer de trial nem precisa assinar). */
export function isFreeUser(perfil: PerfilAssinatura | null): boolean {
  return perfil?.subscription_status === 'free'
}
