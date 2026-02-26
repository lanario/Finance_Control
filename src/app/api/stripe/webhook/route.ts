import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeClient, type StripeContext } from '@/lib/stripe'
import { createSupabaseAdminPessoal } from '@/lib/supabase/server-pessoal'
import { createSupabaseAdminEmpresarial } from '@/lib/supabase/server-empresarial'

function getAdmin(context: StripeContext) {
  return context === 'empresarial' ? createSupabaseAdminEmpresarial() : createSupabaseAdminPessoal()
}

/**
 * Webhook Stripe: atualiza perfis (pessoal ou empresarial) conforme eventos.
 * O metadata.context na sessão/assinatura define qual banco atualizar.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET não configurada.')
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 500 })
  }

  let event: Stripe.Event
  const body = await request.text()
  const sig = request.headers.get('stripe-signature') ?? ''

  try {
    const stripe = getStripeClient()
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Assinatura inválida'
    console.error('[webhook] Verificação de assinatura falhou:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription' || !session.subscription || !session.customer) {
          break
        }
        const context: StripeContext = (session.metadata?.context as StripeContext) || 'pessoal'
        const admin = getAdmin(context)
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer.id
        const perfisId = session.metadata?.perfis_id

        const updatePayload: Record<string, unknown> = {
          subscription_status: 'active',
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        }
        if (perfisId) {
          await admin.from('perfis').update(updatePayload).eq('id', perfisId)
        } else {
          await admin.from('perfis').update(updatePayload).eq('stripe_customer_id', customerId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const context: StripeContext = (sub.metadata?.context as StripeContext) || 'pessoal'
        const admin = getAdmin(context)
        const status = sub.status
        const active = status === 'active'
        const expiredOrCanceled = ['canceled', 'unpaid', 'past_due'].includes(status)
        const newStatus = active ? 'active' : expiredOrCanceled ? 'expired' : status

        await admin
          .from('perfis')
          .update({
            subscription_status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const context: StripeContext = (sub.metadata?.context as StripeContext) || 'pessoal'
        const admin = getAdmin(context)
        await admin
          .from('perfis')
          .update({
            subscription_status: 'expired',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[webhook] Erro ao processar', event.type, err)
    return NextResponse.json({ error: 'Falha ao processar evento.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
