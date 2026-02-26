'use client'

/**
 * Fundo animado no estilo NeonGrid: grid digital/circuito com cápsulas
 * flutuantes e ponto de luz verde neon. Usado na auth empresarial.
 */
export default function NeonGridBackground() {
  const capsules = [
    { left: '10%', top: '15%', delay: 0, horizontal: true },
    { left: '75%', top: '25%', delay: 1.5, horizontal: false },
    { left: '25%', top: '60%', delay: 0.8, horizontal: true },
    { left: '85%', top: '70%', delay: 2, horizontal: false },
    { left: '50%', top: '35%', delay: 0.3, horizontal: false },
    { left: '15%', top: '80%', delay: 1.2, horizontal: true },
    { left: '60%', top: '12%', delay: 2.5, horizontal: false },
    { left: '40%', top: '88%', delay: 0.5, horizontal: true },
    { left: '90%', top: '45%', delay: 1.8, horizontal: true },
    { left: '30%', top: '42%', delay: 1, horizontal: false },
  ]

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: '#0d0d0d' }}
      aria-hidden
    >
      {/* Grid de linhas sutis (circuito) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.18]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="neon-grid-pattern"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="#00ff88"
              strokeWidth="0.4"
              className="opacity-70"
            />
          </pattern>
          <linearGradient id="neon-line-glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00ff88" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#00ff88" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00ff88" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#neon-grid-pattern)" />
      </svg>

      {/* Ondas de brilho suaves */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 30%, rgba(0, 255, 136, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 60% 80% at 80% 70%, rgba(0, 255, 136, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 100% 100% at 50% 50%, rgba(0, 255, 136, 0.03) 0%, transparent 60%)
          `,
        }}
      />

      {/* Cápsulas flutuantes com ponto neon (estilo NeonGrid) */}
      {capsules.map((cap, i) => (
        <div
          key={i}
          className="neon-capsule absolute w-24 h-9 rounded-full flex items-center pointer-events-none"
          style={{
            left: cap.left,
            top: cap.top,
            animationDelay: `${cap.delay}s`,
            transform: cap.horizontal ? 'none' : 'rotate(90deg)',
            background: 'rgba(38, 38, 38, 0.85)',
            border: '1px solid rgba(75, 85, 99, 0.5)',
            boxShadow: 'inset 0 0 24px rgba(0, 255, 136, 0.06), 0 0 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          <span
            className="absolute w-2.5 h-2.5 rounded-full"
            style={{
              left: '28%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#00ff88',
              boxShadow: '0 0 12px rgba(0, 255, 136, 0.9), 0 0 24px rgba(0, 255, 136, 0.4)',
            }}
          />
        </div>
      ))}

      {/* Linhas horizontais/verticais decorativas animadas */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[length:40px_40px] animate-grid-flow"
        style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 0%, #00ff88 1px, transparent 1px),
            linear-gradient(0deg, transparent 0%, #00ff88 1px, transparent 1px)
          `,
        }}
      />
    </div>
  )
}
