'use client'

import { useState, useEffect } from 'react'
import { FiSmartphone } from 'react-icons/fi'

const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ??
  'https://play.google.com/store/apps/details?id=com.infinitylines.app'
const APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL ??
  'https://apps.apple.com/app/infinity-lines/id000000000'
const DEEP_LINK_SCHEME = 'infinitylines://'

/**
 * Detecta se o usuário está em um navegador mobile (para mostrar "Abrir no app").
 */
function useIsMobileWeb(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const ua = navigator.userAgent.toLowerCase()
    const mobile =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) ||
      (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0 && window.innerWidth < 768)
    setIsMobile(mobile)
  }, [])
  return isMobile
}

interface InstallAppBannerProps {
  /** Estilo compacto para sidebar/rodapé (uma linha, link discreto) */
  compact?: boolean
  className?: string
}

/**
 * Banner/CTA para instalar ou abrir o app Infinity Lines.
 * Em mobile web: opção "Abrir no app" (deep link). Em desktop: links para Play Store e App Store.
 */
export default function InstallAppBanner({ compact = false, className = '' }: InstallAppBannerProps) {
  const isMobileWeb = useIsMobileWeb()

  function openApp() {
    if (typeof window === 'undefined') return
    window.location.href = DEEP_LINK_SCHEME
  }

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-2 text-sm text-gray-400 ${className}`}>
        <FiSmartphone className="w-4 h-4 shrink-0" aria-hidden />
        <span>Também disponível no celular:</span>
        {isMobileWeb ? (
          <button
            type="button"
            onClick={openApp}
            className="text-primary hover:text-primary-dark font-medium underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
          >
            Abrir no app
          </button>
        ) : (
          <>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-dark font-medium underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
            >
              Google Play
            </a>
            <span aria-hidden>·</span>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-dark font-medium underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
            >
              App Store
            </a>
          </>
        )}
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-gray-600/50 bg-gray-800/80 p-4 ${className}`}
      role="complementary"
      aria-label="Opções para instalar o app Infinity Lines"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <FiSmartphone className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">Infinity Lines no celular</p>
          <p className="mt-0.5 text-sm text-gray-400">
            {isMobileWeb
              ? 'Toque para abrir no app instalado.'
              : 'Baixe o app para Android ou iOS e leve suas finanças no bolso.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {isMobileWeb ? (
              <button
                type="button"
                onClick={openApp}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Abrir no app
              </button>
            ) : (
              <>
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Google Play
                </a>
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  App Store
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
