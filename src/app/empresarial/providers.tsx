'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import type { Session } from '@supabase/supabase-js'
import { ThemeEmpresarialProvider } from './ThemeEmpresarialContext'

interface AuthContextType {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <ThemeEmpresarialProvider>
      <AuthContext.Provider value={{ session, loading }}>
        {children}
      </AuthContext.Provider>
    </ThemeEmpresarialProvider>
  )
}

export const useAuth = () => useContext(AuthContext)
