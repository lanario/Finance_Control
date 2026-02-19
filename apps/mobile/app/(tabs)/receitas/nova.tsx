import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { supabasePessoal } from '../../../lib/supabase-pessoal'

const MESES = [1,2,3,4,5,6,7,8,9,10,11,12]

/**
 * Cadastro de nova receita (Fase 3).
 */
export default function NovaReceitaScreen() {
  const router = useRouter()
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().split('T')[0])
  const [tipo, setTipo] = useState<'fixa' | 'extra'>('fixa')
  const now = new Date()
  const [mesRef, setMesRef] = useState(now.getMonth() + 1)
  const [anoRef, setAnoRef] = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabasePessoal.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [])

  async function handleSalvar() {
    if (!userId) return
    const v = parseFloat(valor.replace(',', '.'))
    if (!descricao.trim() || isNaN(v) || v <= 0) {
      Alert.alert('Erro', 'Preencha descrição e valor válido.')
      return
    }
    setLoading(true)
    try {
      await supabasePessoal.from('receitas').insert({
        user_id: userId,
        descricao: descricao.trim(),
        valor: v,
        data,
        tipo,
        mes_referencia: mesRef,
        ano_referencia: anoRef,
      })
      router.back()
    } catch (e) {
      console.error('Erro ao salvar receita:', e)
      Alert.alert('Erro', 'Não foi possível salvar a receita.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={styles.input}
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Ex.: Salário"
          placeholderTextColor="rgba(255,255,255,0.4)"
          editable={!loading}
        />
        <Text style={styles.label}>Valor (R$)</Text>
        <TextInput
          style={styles.input}
          value={valor}
          onChangeText={setValor}
          placeholder="0,00"
          placeholderTextColor="rgba(255,255,255,0.4)"
          keyboardType="decimal-pad"
          editable={!loading}
        />
        <Text style={styles.label}>Data</Text>
        <TextInput
          style={styles.input}
          value={data}
          onChangeText={setData}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="rgba(255,255,255,0.4)"
          editable={!loading}
        />
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.tipoBtn, tipo === 'fixa' && styles.tipoBtnActive]}
            onPress={() => setTipo('fixa')}
            disabled={loading}
          >
            <Text style={[styles.tipoBtnText, tipo === 'fixa' && styles.tipoBtnTextActive]}>Fixa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipoBtn, tipo === 'extra' && styles.tipoBtnActive]}
            onPress={() => setTipo('extra')}
            disabled={loading}
          >
            <Text style={[styles.tipoBtnText, tipo === 'extra' && styles.tipoBtnTextActive]}>Extra</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.label}>Mês / Ano de referência</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.inputSmall]}
            value={String(mesRef)}
            onChangeText={(t) => setMesRef(parseInt(t, 10) || 1)}
            placeholder="Mês"
            keyboardType="number-pad"
            editable={!loading}
          />
          <TextInput
            style={[styles.input, styles.inputSmall]}
            value={String(anoRef)}
            onChangeText={(t) => setAnoRef(parseInt(t, 10) || new Date().getFullYear())}
            placeholder="Ano"
            keyboardType="number-pad"
            editable={!loading}
          />
        </View>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSalvar}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar receita</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={loading}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f' },
  scroll: { padding: 16, paddingBottom: 48 },
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
  inputSmall: { flex: 1, marginHorizontal: 4 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tipoBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  tipoBtnActive: { borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.2)' },
  tipoBtnText: { color: 'rgba(255,255,255,0.9)', fontSize: 16 },
  tipoBtnTextActive: { color: '#10b981', fontWeight: '600' },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { alignItems: 'center', marginTop: 16 },
  cancelText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
})
