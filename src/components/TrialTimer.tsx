'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FiClock } from 'react-icons/fi'
import type { PerfilAssinatura } from '@/types/assinatura'

export type TrialTimerVariant = 'pessoal' | 'empresarial'

interface TrialTimerProps {
  perfil: PerfilAssinatura | null | undefined
  /** Rotas de assinatura para o link "Assinar" (ex: /pessoal/assinatura ou /empresarial/assinatura) */
  assinaturaHref: string
  variant?: TrialTimerVariant
}

/**
 * Calcula o tempo restante até uma data e retorna { hours, minutes, seconds } ou null se já passou.
 */
function getRemaining(endAt: Date): { hours: number; minutes: number; seconds: number } | null {
  const now = new Date()
  const diff = endAt.getTime() - now.getTime()
  if (diff <= 0) return null
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { hours, minutes, seconds }
}

function formatSegment(n: number): string {
  return n.toString().padStart(2, '0')
}

export function TrialTimer({ perfil, assinaturaHref, variant = 'pessoal' }: TrialTimerProps) {
  const [remaining, setRemaining] = useState<{
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  const isFree = perfil?.subscription_status === 'free'
  const isTrialing = !isFree && perfil?.subscription_status === 'trialing'
  const trialEndsAt = perfil?.trial_ends_at ? new Date(perfil.trial_ends_at) : null

  useEffect(() => {
    if (!isTrialing || !trialEndsAt) {
      setRemaining(null)
      return
    }
    function tick() {
      const r = getRemaining(trialEndsAt!)
      setRemaining(r)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when trial state or end time changes
  }, [isTrialing, trialEndsAt?.getTime()])

  if (!isTrialing || !trialEndsAt || remaining === null) {
    return null
  }

  const label =
    remaining.hours > 0
      ? `${remaining.hours}h ${formatSegment(remaining.minutes)}m ${formatSegment(remaining.seconds)}s`
      : `${formatSegment(remaining.minutes)}m ${formatSegment(remaining.seconds)}s`

  const isPessoal = variant === 'pessoal'
  const wrapperClass = isPessoal
    ? 'bg-gray-800/90 border-gray-700 text-gray-100'
    : 'emp-bg-card border emp-border emp-text-primary'
  const linkClass = isPessoal
    ? 'text-primary hover:text-primary/90 font-medium'
    : 'font-medium hover:opacity-90'
  const linkStyle = !isPessoal ? { color: 'var(--emp-accent)' } : undefined

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 text-sm ${wrapperClass}`}
      role="timer"
      aria-live="polite"
      aria-label={`Tempo restante do teste grátis: ${label}`}
    >
      <div className="flex items-center gap-2">
        <FiClock className="flex-shrink-0 text-base opacity-90" aria-hidden />
        <span>
          Teste grátis: <strong className="tabular-nums">{label}</strong>
        </span>
      </div>
      <Link
        href={assinaturaHref}
        className={`flex-shrink-0 transition-opacity ${linkClass}`}
        style={linkStyle}
      >
        Assinar
      </Link>
    </div>
  )
}
