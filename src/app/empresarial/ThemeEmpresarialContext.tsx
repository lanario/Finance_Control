'use client'

import { createContext, useContext } from 'react'

/** Tema único: preto, cinza e verde neon. Modo claro/escuro removido. */
export type ThemeEmpresarial = 'dark'

interface ThemeEmpresarialContextType {
  theme: ThemeEmpresarial
  setTheme: (_: ThemeEmpresarial) => void
  toggleTheme: () => void
}

const ThemeEmpresarialContext = createContext<ThemeEmpresarialContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeEmpresarialProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeEmpresarialContext.Provider
      value={{
        theme: 'dark',
        setTheme: () => {},
        toggleTheme: () => {},
      }}
    >
      {children}
    </ThemeEmpresarialContext.Provider>
  )
}

export function useThemeEmpresarial() {
  const ctx = useContext(ThemeEmpresarialContext)
  if (!ctx) {
    throw new Error('useThemeEmpresarial deve ser usado dentro de ThemeEmpresarialProvider')
  }
  return ctx
}
