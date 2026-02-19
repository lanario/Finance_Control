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
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState, useEffect } from 'react'
import { supabasePessoal } from '../../../lib/supabase-pessoal'

const TIPOS = ['Ações', 'FIIs', 'Tesouro Direto', 'CDB', 'LCI/LCA', 'Fundos', 'Outros']

export default function EditarInvestimentoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState(TIPOS[0])
  const [valorInvestido, setValorInvestido] = useState('')
  const [valorAtual, setValorAtual] = useState('')
  const [dataAquisicao, setDataAquisicao] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!id) return
    supabasePessoal
      .from('investimentos')
      .select('nome, tipo, valor_investido, valor_atual, data_aquisicao')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setNome(data.nome ?? '')
          setTipo(data.tipo && TIPOS.includes(data.tipo) ? data.tipo : TIPOS[0])
          setValorInvestido(String(data.valor_investido ?? ''))
          setValorAtual(String(data.valor_atual ?? ''))
          setDataAquisicao(data.data_aquisicao ?? '')
        }
      })
      .finally(() => setLoadingData(false))
  }, [id])

  async function handleSalvar() {
    if (!id) return
    const vi = parseFloat(valorInvestido.replace(',', '.'))
    const va = parseFloat(valorAtual.replace(',', '.'))
    if (!nome.trim() || isNaN(vi) || vi < 0 || isNaN(va) || va < 0) {
      Alert.alert('Erro', 'Preencha nome, valor investido e valor atual.')
      return
    }
    setLoading(true)
    try {
      await supabasePessoal
        .from('investimentos')
        .update({
          nome: nome.trim(),
          tipo,
          valor_investido: vi,
          valor_atual: va,
          data_aquisicao: dataAquisicao,
        })
        .eq('id', id)
      router.back()
    } catch (e) {
      console.error('Erro ao atualizar investimento:', e)
      Alert.alert('Erro', 'Não foi possível atualizar.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex.: CDB Banco X"
          placeholderTextColor="rgba(255,255,255,0.4)"
          editable={!loading}
        />
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.chips}>
          {TIPOS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, tipo === t && styles.chipSel]}
              onPress={() => setTipo(t)}
              disabled={loading}
            >
              <Text style={[styles.chipText, tipo === t && styles.chipTextSel]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Valor investido (R$) *</Text>
        <TextInput
          style={styles.input}
          value={valorInvestido}
          onChangeText={setValorInvestido}
          placeholder="0,00"
          placeholderTextColor="rgba(255,255,255,0.4)"
          keyboardType="decimal-pad"
          editable={!loading}
        />
        <Text style={styles.label}>Valor atual (R$) *</Text>
        <TextInput
          style={styles.input}
          value={valorAtual}
          onChangeText={setValorAtual}
          placeholder="0,00"
          placeholderTextColor="rgba(255,255,255,0.4)"
          keyboardType="decimal-pad"
          editable={!loading}
        />
        <Text style={styles.label}>Data de aquisição</Text>
        <TextInput
          style={styles.input}
          value={dataAquisicao}
          onChangeText={setDataAquisicao}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="rgba(255,255,255,0.4)"
          editable={!loading}
        />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSalvar} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={loading}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f' },
  scroll: { padding: 16, paddingBottom: 48 },
  centered: { justifyContent: 'center', alignItems: 'center' },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chipSel: { backgroundColor: '#10b981', borderColor: '#10b981' },
  chipText: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  chipTextSel: { color: '#fff', fontWeight: '600' },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', marginTop: 16 },
  cancelText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
})
