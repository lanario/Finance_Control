'use client'

/**
 * Fundo estilo Aura em branco neon para a landing.
 * Círculos concêntricos (radar), linhas onduladas (fluxo infinito), pontos dispersos
 * e coluna de pontos — tudo em branco neon com animações sutis.
 */
export default function LandingAuraBackground() {
  const neonWhite = 'rgba(240, 249, 255, 0.9)'
  const neonDim = 'rgba(240, 249, 255, 0.5)'
  const neonSoft = 'rgba(240, 249, 255, 0.25)'
  const neonFaint = 'rgba(240, 249, 255, 0.12)'
  const neonGlow = 'rgba(240, 249, 255, 0.45)'

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      aria-hidden
    >
      {/* Grid sutil em branco neon */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(${neonFaint} 1px, transparent 1px),
            linear-gradient(90deg, ${neonFaint} 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <radialGradient id="neon-hub-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={neonGlow} />
            <stop offset="50%" stopColor="rgba(240, 249, 255, 0.15)" />
            <stop offset="100%" stopColor="rgba(240, 249, 255, 0)" />
          </radialGradient>
          {/* Máscara para o segmento de fluxo que “viaja” na curva */}
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Hub central: glow */}
        <circle
          cx="600"
          cy="400"
          r="200"
          fill="url(#neon-hub-glow)"
          className="animate-aura-hub-pulse"
        />

        {/* Círculos concêntricos (radar) em branco neon */}
        <circle
          cx="600"
          cy="400"
          r="50"
          fill="none"
          stroke={neonSoft}
          strokeWidth="1.5"
          strokeDasharray="6 10"
          className="animate-aura-dash"
          filter="url(#neon-glow)"
        />
        <circle
          cx="600"
          cy="400"
          r="100"
          fill="none"
          stroke={neonFaint}
          strokeWidth="1"
          strokeDasharray="8 14"
          className="animate-aura-dash"
          style={{ animationDelay: '0.5s' }}
        />
        <circle
          cx="600"
          cy="400"
          r="160"
          fill="none"
          stroke={neonFaint}
          strokeWidth="1"
          strokeDasharray="10 18"
          className="animate-aura-dash"
          style={{ animationDelay: '1s' }}
        />
        <circle
          cx="600"
          cy="400"
          r="220"
          fill="none"
          stroke="rgba(240, 249, 255, 0.06)"
          strokeWidth="1"
          strokeDasharray="12 20"
          className="animate-aura-dash"
          style={{ animationDelay: '1.5s' }}
        />

        {/* Ponto central */}
        <circle
          cx="600"
          cy="400"
          r="5"
          fill={neonWhite}
          className="animate-aura-dot"
          filter="url(#neon-glow)"
        />

        {/* Linhas onduladas (formato infinito/ampulheta) — base em cinza suave */}
        <path
          d="M 100 350 Q 600 150 1100 350 Q 600 550 100 350"
          stroke={neonFaint}
          strokeWidth="1"
          fill="none"
          strokeDasharray="4 8"
          className="animate-aura-dash"
        />
        <path
          d="M 100 450 Q 600 650 1100 450 Q 600 250 100 450"
          stroke={neonFaint}
          strokeWidth="1"
          fill="none"
          strokeDasharray="4 8"
          className="animate-aura-dash"
          style={{ animationDelay: '1s' }}
        />

        {/* Segmento de “fluxo” destacado na curva superior (branco neon) */}
        <path
          d="M 100 350 Q 600 150 1100 350"
          stroke={neonDim}
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="200 1200"
          className="animate-neon-flow-segment"
          filter="url(#neon-glow)"
        />

        {/* Três quadrados/pontos horizontais perto do centro */}
        <rect x="595" y="397" width="4" height="4" fill={neonSoft} className="animate-aura-dot" />
        <rect x="605" y="397" width="4" height="4" fill={neonDim} className="animate-aura-dot" style={{ animationDelay: '0.3s' }} />
        <rect x="615" y="397" width="4" height="4" fill={neonSoft} className="animate-aura-dot" style={{ animationDelay: '0.6s' }} />

        {/* Coluna vertical de pontos (lado direito) */}
        {Array.from({ length: 24 }, (_, i) => (
          <circle
            key={`col-${i}`}
            cx="1120"
            cy={120 + i * 28}
            r="1.5"
            fill={i % 3 === 0 ? neonDim : neonSoft}
            className="animate-aura-dot"
            style={{ animationDelay: `${i * 0.08}s` }}
          />
        ))}

        {/* Pontos dispersos (canto superior esquerdo e outros) */}
        {[
          [180, 120], [220, 160], [160, 200], [240, 140], [200, 180],
          [950, 100], [980, 140], [920, 180], [1000, 120],
          [500, 200], [700, 180], [400, 600], [800, 620],
        ].map(([x, y], i) => (
          <circle
            key={`dot-${i}`}
            cx={x}
            cy={y}
            r="1"
            fill={neonFaint}
            className="animate-aura-dot"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </svg>

      {/* Gradiente suave nas bordas para não competir com o conteúdo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 60% at 50% -30%, transparent 45%, rgba(10,10,10,0.3) 100%), radial-gradient(ellipse 80% 50% at 50% 50%, transparent 55%, rgba(10,10,10,0.15) 100%)',
        }}
      />
    </div>
  )
}
