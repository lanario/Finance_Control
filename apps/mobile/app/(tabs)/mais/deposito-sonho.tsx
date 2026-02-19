import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState, useEffect } from 'react'
import { supabasePessoal } from '../../../lib/supabase-pessoal'

export default function DepositoSonhoScreen() {
  const { sonhoId, sonhoNome } = useLocalSearchParams<{ sonhoId: string; sonhoNome?: string }>()
  const router = useRouter()
  const [valor, setValor] = useState('')
  const [mes, setMes] = useState(String(new Date().getMonth() + 1))
  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabasePessoal.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [])

  async function handleDepositar() {
    if (!userId || !sonhoId) return
    const v = parseFloat(valor.replace(',', '.'))
    const mesNum = parseInt(mes, 10)
    const anoNum = parseInt(ano, 10)
    if (isNaN(v) || v <= 0 || mesNum < 1 || mesNum > 12 || isNaN(anoNum)) {
      Alert.alert('Erro', 'Preencha valor válido, mês (1-12) e ano.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabasePessoal.from('sonhos_depositos').insert({
        sonho_id: sonhoId,
        user_id: userId,
        valor: v,
        mes: mesNum,
        ano: anoNum,
      })
      if (error) {
        if (error.code === '23505') Alert.alert('Aviso', 'Já existe depósito para este sonho no mês/ano informado.')
        else throw error
      } else {
        router.back()
      }
    } catch (e) {
      console.error('Erro ao registrar depósito:', e)
      Alert.alert('Erro', 'Não foi possível registrar o depósito.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        {sonhoNome ? (
          <Text style={styles.sonhoNome}>{sonhoNome}</Text>
        ) : null}
        <Text style={styles.label}>Valor do depósito (R$) *</Text>
        <TextInput
          style={styles.input}
          value={valor}
          onChangeText={setValor}
          placeholder="0,00"
          placeholderTextColor="rgba(255,255,255,0.4)"
          keyboardType="decimal-pad"
          editable={!loading}
        />
        <Text style={styles.label}>Mês (1-12)</Text>
        <TextInput
          style={styles.input}
          value={mes}
          onChangeText={setMes}
          placeholder="Ex.: 3"
          placeholderTextColor="rgba(255,255,255,0.4)"
          keyboardType="number-pad"
          editable={!loading}
        />
        <Text style={styles.label}>Ano</Text>
        <TextInput
          style={styles.input}
          value={ano}
          onChangeText={setAno}
          placeholder="Ex.: 2025"
          placeholderTextColor="rgba(255,255,255,0.4)"
          keyboardType="number-pad"
          editable={!loading}
        />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleDepositar} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrar depósito</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={loading}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f' },
  content: { padding: 16 },
  sonhoNome: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 },
  label: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', marginTop: 16 },
  cancelText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
})
