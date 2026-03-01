'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Fundo para tela de login: grid de pontos estático + brilho sutil que segue
 * o mouse, criando uma reação suave nas áreas da tela sob o cursor.
 */
export default function LoginDotGridBackground() {
  const cols = 36
  const rows = 22
  const total = cols * rows

  const [mouse, setMouse] = useState({ x: 50, y: 50 })
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef({ x: 50, y: 50 })
  const currentRef = useRef({ x: 50, y: 50 })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    targetRef.current = { x, y }
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(updatePosition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updatePosition is stable, no deps needed
  }, [])

  function updatePosition() {
    const target = targetRef.current
    const current = currentRef.current
    const lerp = 0.08
    const x = current.x + (target.x - current.x) * lerp
    const y = current.y + (target.y - current.y) * lerp
    currentRef.current = { x, y }
    setMouse({ x, y })
    if (Math.abs(x - target.x) > 0.2 || Math.abs(y - target.y) > 0.2) {
      rafRef.current = requestAnimationFrame(updatePosition)
    } else {
      rafRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-black"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        targetRef.current = { x: 50, y: 50 }
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(updatePosition)
        }
      }}
      aria-hidden
    >
      {/* Brilho sutil que segue o mouse (área da tela sob o cursor) */}
      <div
        className="login-bg-mouse-glow absolute pointer-events-none transition-opacity duration-300"
        style={{
          width: '28vmax',
          height: '28vmax',
          left: `calc(${mouse.x}% - 14vmax)`,
          top: `calc(${mouse.y}% - 14vmax)`,
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.025) 40%, transparent 65%)',
        }}
      />
      {/* Camada estática de gradientes suaves (sem animação) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%)
          `,
        }}
      />
      {/* Grid de pontos estáticos (sem pulsação) */}
      <div
        className="absolute inset-0 grid items-center justify-center pointer-events-none"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gap: 'clamp(6px, 1.5vw, 14px)',
          padding: 'clamp(8px, 2vw, 24px)',
        }}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className="login-dot-cell flex items-center justify-center w-full h-full"
          >
            <span className="login-dot-static block w-[3px] h-[3px] min-w-[3px] min-h-[3px] rounded-full bg-white/40" />
          </div>
        ))}
      </div>
    </div>
  )
}
