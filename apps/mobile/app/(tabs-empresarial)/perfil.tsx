import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabaseEmpresarial } from '../../lib/supabase-empresarial'
import { Ionicons } from '@expo/vector-icons'

/**
 * Perfil do módulo Empresarial (Fase 4). Sempre usa contexto empresarial.
 */
export default function PerfilEmpresarialScreen() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabaseEmpresarial
      .auth.getUser()
      .then(({ data: { user } }) => {
        setEmail(user?.email ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    await supabaseEmpresarial.auth.signOut()
    router.replace('/')
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color="rgba(255,255,255,0.9)" />
        </View>
        <Text style={styles.label}>Contexto</Text>
        <Text style={styles.value}>Financeiro Empresarial</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{email ?? '—'}</Text>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', padding: 24, paddingTop: 24 },
  centered: { flex: 1, backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 16, color: '#ffffff', marginBottom: 16 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.6)',
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
})
