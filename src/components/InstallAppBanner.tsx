'use client'

import { FiSmartphone } from 'react-icons/fi'

interface InstallAppBannerProps {
  /** Estilo compacto para sidebar/rodapé (uma linha) */
  compact?: boolean
  className?: string
}

/**
 * Aviso de que a versão mobile está em desenvolvimento.
 * Exibido no pessoal, empresarial e na landing.
 */
export default function InstallAppBanner({ compact = false, className = '' }: InstallAppBannerProps) {
  const message = 'Versão mobile em desenvolvimento.'

  if (compact) {
    return (
      <div
        className={`flex w-full flex-wrap items-center justify-center gap-2 text-center text-sm ${className}`}
        role="status"
        aria-label={message}
      >
        <FiSmartphone className="w-4 h-4 shrink-0 opacity-80" aria-hidden />
        <span>{message}</span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-gray-600/50 bg-gray-800/80 p-4 ${className}`}
      role="complementary"
      aria-label={message}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-600/50 text-gray-400">
          <FiSmartphone className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">Infinity Lines no celular</p>
          <p className="mt-0.5 text-sm text-gray-400">{message}</p>
        </div>
      </div>
    </div>
  )
}
