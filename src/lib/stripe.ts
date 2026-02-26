import Stripe from 'stripe'

/**
 * Cliente Stripe para uso apenas no servidor (API routes, Server Actions).
 * Nunca importe em componentes client-side.
 */
function getStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    throw new Error(
      'STRIPE_SECRET_KEY não configurada. Adicione em .env.local para usar checkout/webhooks.'
    )
  }
  return new Stripe(secret, { apiVersion: '2026-01-28.clover' })
}

/** Lazy init para não quebrar build quando STRIPE_SECRET_KEY não está definida. */
export function getStripeClient(): Stripe {
  return getStripe()
}

export type StripeContext = 'pessoal' | 'empresarial' | 'infinity'

/** ID do preço de assinatura. Contexto define qual produto (pessoal, empresarial ou infinity). */
export function getStripePriceId(context: StripeContext): string {
  const envKey =
    context === 'empresarial'
      ? 'STRIPE_PRICE_ID_EMPRESARIAL'
      : context === 'infinity'
        ? 'STRIPE_PRICE_ID_INFINITY'
        : 'STRIPE_PRICE_ID'
  const id =
    process.env[envKey] ||
    (context === 'empresarial'
      ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_EMPRESARIAL
      : context === 'infinity'
        ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_INFINITY
        : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID)
  if (!id) throw new Error(`${envKey} (ou NEXT_PUBLIC_*) não configurado para contexto "${context}".`)
  return id
}
