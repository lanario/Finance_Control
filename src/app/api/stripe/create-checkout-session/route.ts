import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { getStripeClient, getStripePriceId, type StripeContext } from '@/lib/stripe'
import { createSupabaseAdminPessoal, hasSupabaseAdminPessoalConfig } from '@/lib/supabase/server-pessoal'
import { createSupabaseAdminEmpresarial, hasSupabaseAdminEmpresarialConfig } from '@/lib/supabase/server-empresarial'

const config = {
  pessoal: {
    url: process.env.NEXT_PUBLIC_SUPABASE_PESSOAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_PESSOAL_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    successPath: '/pessoal/dashboard',
    cancelPath: '/pessoal/assinatura',
  },
  empresarial: {
    url: process.env.NEXT_PUBLIC_SUPABASE_EMPRESARIAL_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_EMPRESARIAL_ANON_KEY,
    successPath: '/empresarial/dashboard',
    cancelPath: '/empresarial/assinatura',
  },
  /** Infinity usa contexto pessoal para auth/perfil; success leva ao dashboard pessoal. */
  infinity: {
    url: process.env.NEXT_PUBLIC_SUPABASE_PESSOAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_PESSOAL_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    successPath: '/pessoal/dashboard',
    cancelPath: '/pessoal/assinatura',
  },
} as const

/** Em desenvolvimento, retorna lista do que está faltando no .env.local para o checkout. */
function getMissingConfig(context: StripeContext): string[] {
  const missing: string[] = []
  const cfg = config[context]
  if (!cfg.url || !cfg.anonKey) missing.push('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (pessoal)')
  if ((context === 'pessoal' || context === 'infinity') && !hasSupabaseAdminPessoalConfig()) missing.push('SUPABASE_PESSOAL_SERVICE_ROLE_KEY')
  if (context === 'empresarial' && !hasSupabaseAdminEmpresarialConfig()) missing.push('SUPABASE_EMPRESARIAL_SERVICE_ROLE_KEY')
  if (!process.env.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY')
  const priceKey = context === 'empresarial' ? 'STRIPE_PRICE_ID_EMPRESARIAL' : context === 'infinity' ? 'STRIPE_PRICE_ID_INFINITY' : 'STRIPE_PRICE_ID'
  const hasPrice = process.env[priceKey] || (context === 'empresarial' ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_EMPRESARIAL : context === 'infinity' ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_INFINITY : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID)
  if (!hasPrice) missing.push(priceKey)
  return missing
}

/**
 * Cria uma Stripe Checkout Session para assinatura (R$ 20/mês Pessoal, R$ 30/mês Empresarial, R$ 49/mês Infinity).
 * Body: { context?: 'pessoal' | 'empresarial' } (default: 'pessoal').
 * Requer Authorization: Bearer <access_token> do Supabase Auth (do contexto informado).
 */
export async function POST(request: NextRequest) {
  let context: StripeContext = 'pessoal'
  let user: { id: string; email?: string | null } | null = null

  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '')
    if (!token) {
      return NextResponse.json(
        { error: 'Não autorizado. Token ausente.' },
        { status: 401 }
      )
    }

    let body: { context?: string } = {}
    try {
      body = await request.json()
    } catch {
      // body vazio ou inválido: usar pessoal
    }
    context =
      body.context === 'empresarial' ? 'empresarial' : body.context === 'infinity' ? 'infinity' : 'pessoal'

    const cfg = config[context]
    const missing = getMissingConfig(context)
    if (missing.length > 0) {
      const isDev = process.env.NODE_ENV === 'development'
      const message = isDev
        ? `Configure no .env.local e reinicie o servidor: ${missing.join(', ')}`
        : 'Serviço de pagamento temporariamente indisponível. Tente novamente em alguns minutos ou entre em contato com o suporte.'
      console.error('[create-checkout-session] Configuração faltando:', missing)
      return NextResponse.json(
        { error: message },
        { status: 503 }
      )
    }

    const supabaseAuth = createClient(cfg.url!, cfg.anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user: userData }, error: userError } = await supabaseAuth.auth.getUser(token)
    user = userData ?? null
    if (userError || !user?.email) {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401 })
    }

    const admin = context === 'empresarial' ? createSupabaseAdminEmpresarial() : createSupabaseAdminPessoal()
    const { data: perfil, error: perfilError } = await admin
      .from('perfis')
      .select('id, user_id, stripe_customer_id, subscription_status')
      .eq('user_id', user.id)
      .single()

    if (perfilError || !perfil) {
      return NextResponse.json(
        { error: 'Perfil não encontrado. Faça login novamente.' },
        { status: 404 }
      )
    }

    const stripe = getStripeClient()
    const priceId = getStripePriceId(context)
    if (process.env.NODE_ENV === 'development') {
      console.log('[create-checkout-session] Usando STRIPE_PRICE_ID:', priceId)
    }
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

    let customerId = perfil.stripe_customer_id as string | null

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
          perfis_id: perfil.id,
          context,
        },
      })
      customerId = customer.id
      await admin
        .from('perfis')
        .update({ stripe_customer_id: customerId })
        .eq('id', perfil.id)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}${cfg.successPath}?checkout=success`,
      cancel_url: `${baseUrl}${cfg.cancelPath}`,
      subscription_data: {
        metadata: { supabase_user_id: user.id, perfis_id: perfil.id, context },
      },
      metadata: { supabase_user_id: user.id, perfis_id: perfil.id, context },
      locale: 'pt-BR',
      allow_promotion_codes: true,
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe não retornou URL de checkout.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    if (err instanceof Stripe.errors.StripeError) {
      console.error('[create-checkout-session] Stripe:', err.code, err.message, 'param:', err.param)
      const isMissingPrice = err.code === 'resource_missing' && err.param?.includes('price')
      if (isMissingPrice) {
        const hint = process.env.NODE_ENV === 'development'
          ? ` Use no .env.local o Price ID exato do Stripe (Produtos > Infinity_Pessoal > Preços). Erro: ${err.message}`
          : ''
        return NextResponse.json(
          { error: `Preço de assinatura não encontrado no Stripe.${hint}` },
          { status: 400 }
        )
      }
      const isMissingCustomer = err.code === 'resource_missing' && (err.param?.includes('customer') ?? err.message.includes('No such customer'))
      if (isMissingCustomer) {
        try {
          const admin = context === 'empresarial' ? createSupabaseAdminEmpresarial() : createSupabaseAdminPessoal()
          const { data: perfilRetry } = await admin.from('perfis').select('id').eq('user_id', user!.id).single()
          if (!perfilRetry) throw new Error('Perfil não encontrado')
          await admin.from('perfis').update({ stripe_customer_id: null }).eq('id', perfilRetry.id)
          const stripe = getStripeClient()
          const newCustomer = await stripe.customers.create({
            email: user!.email!,
            metadata: { supabase_user_id: user!.id, perfis_id: perfilRetry.id, context },
          })
          await admin.from('perfis').update({ stripe_customer_id: newCustomer.id }).eq('id', perfilRetry.id)
          const priceId = getStripePriceId(context)
          const cfg = config[context]
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
          const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: newCustomer.id,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${baseUrl}${cfg.successPath}?checkout=success`,
            cancel_url: `${baseUrl}${cfg.cancelPath}`,
            subscription_data: {
              metadata: { supabase_user_id: user!.id, perfis_id: perfilRetry.id, context },
            },
            metadata: { supabase_user_id: user!.id, perfis_id: perfilRetry.id, context },
            locale: 'pt-BR',
            allow_promotion_codes: true,
          })
          if (session.url) return NextResponse.json({ url: session.url })
        } catch (retryErr) {
          console.error('[create-checkout-session] Retry após No such customer falhou:', retryErr)
        }
        return NextResponse.json(
          { error: 'Cliente de pagamento inválido. Tente clicar em "Assinar por R$ 20/mês" novamente.' },
          { status: 400 }
        )
      }
    }
    console.error('[create-checkout-session]', err)

    const isConfigError = err instanceof Error && (
      err.message.includes('SUPABASE_') ||
      err.message.includes('STRIPE_') ||
      err.message.includes('não configurad')
    )
    const message = isConfigError
      ? 'Serviço de pagamento temporariamente indisponível. Tente mais tarde ou entre em contato com o suporte.'
      : (err instanceof Error ? err.message : 'Erro ao criar sessão de checkout.')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
