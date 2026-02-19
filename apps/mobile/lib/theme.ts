/**
 * Tema dark do app mobile – fundos escuros e texto claro.
 * Única fonte de cores para consistência e modo escuro.
 */
export const theme = {
  /** Fundo principal (azul marinho) */
  background: '#1e3a5f',
  /** Fundo um pouco mais escuro para stacks/overlays */
  backgroundDark: '#162842',
  /** Cards e blocos sobre o fundo principal */
  card: 'rgba(255,255,255,0.1)',
  /** Área de gráficos (mais escura para contraste) */
  chartWrap: 'rgba(0,0,0,0.25)',
  /** Borda sutil em cards */
  border: 'rgba(255,255,255,0.1)',
  borderInput: 'rgba(255,255,255,0.2)',
  /** Texto principal */
  text: '#ffffff',
  /** Texto secundário */
  textSecondary: 'rgba(255,255,255,0.9)',
  /** Texto terciário / labels */
  textMuted: 'rgba(255,255,255,0.7)',
  /** Placeholder e hints */
  textPlaceholder: 'rgba(255,255,255,0.5)',
  /** Cor primária (ações, positivo) */
  primary: '#10b981',
  /** Perigo / negativo */
  danger: '#ef4444',
  /** Informação / neutro */
  info: '#3b82f6',
  /** Ícones inativos na tab bar */
  tabInactive: 'rgba(255,255,255,0.6)',
} as const

export type Theme = typeof theme
