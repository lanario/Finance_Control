import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseAdminPessoal } from '@/lib/supabase/server-pessoal'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_PESSOAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PESSOAL_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Garante que o usuário autenticado tenha um registro em perfis (trial 24h).
 * Chamado quando o cliente tem session mas perfil ainda não existe.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (!token || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)
  if (userError || !user?.id) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 })
  }

  const admin = createSupabaseAdminPessoal()
  const { data: existing } = await admin
    .from('perfis')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ ok: true, created: false })
  }

  const trialEndsAt = new Date()
  trialEndsAt.setHours(trialEndsAt.getHours() + 24)

  const nome = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null

  const { error: insertError } = await admin.from('perfis').insert({
    user_id: user.id,
    nome,
    subscription_status: 'trialing',
    trial_ends_at: trialEndsAt.toISOString(),
  })

  if (insertError) {
    console.error('[ensure-profile]', insertError)
    return NextResponse.json({ error: 'Erro ao criar perfil.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, created: true })
}
