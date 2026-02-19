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
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { supabasePessoal } from '../../../lib/supabase-pessoal'

/**
 * Formulário de nova compra no cartão (Fase 3).
 */
export default function NovaCompraScreen() {
  const { id: cartaoId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().split('T')[0])
  const [categoria, setCategoria] = useState('Outros')
  const [parcelada, setParcelada] = useState(false)
  const [totalParcelas, setTotalParcelas] = useState('1')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabasePessoal.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [])

  async function handleSalvar() {
    if (!cartaoId || !userId) return
    const v = parseFloat(valor.replace(',', '.'))
    if (!descricao.trim() || isNaN(v) || v <= 0) {
      Alert.alert('Erro', 'Preencha descrição e valor válido.')
      return
    }
    const totalP = parcelada ? Math.max(1, parseInt(totalParcelas, 10) || 1) : 1
    setLoading(true)
    try {
      if (parcelada && totalP > 1) {
        const valorParcela = v / totalP
        const hoje = new Date(data)
        const parcelas: { user_id: string; cartao_id: string; compra_id: string | null; descricao: string; valor: number; numero_parcela: number; total_parcelas: number; data_vencimento: string; categoria: string }[] = []
        const { data: compra } = await supabasePessoal
          .from('compras')
          .insert({
            user_id: userId,
            cartao_id: cartaoId,
            descricao: descricao.trim(),
            valor: v,
            data,
            categoria: categoria.trim() || 'Outros',
            parcelada: true,
            total_parcelas: totalP,
          })
          .select('id')
          .single()
        if (compra?.id) {
          for (let i = 1; i <= totalP; i++) {
            const venc = new Date(hoje.getFullYear(), hoje.getMonth() + i, hoje.getDate())
            parcelas.push({
              user_id: userId,
              cartao_id: cartaoId,
              compra_id: compra.id,
              descricao: `${descricao.trim()} (${i}/${totalP})`,
              valor: valorParcela,
              numero_parcela: i,
              total_parcelas: totalP,
              data_vencimento: venc.toISOString().split('T')[0],
              categoria: categoria.trim() || 'Outros',
            })
          }
          await supabasePessoal.from('parcelas').insert(parcelas)
        }
      } else {
        await supabasePessoal.from('compras').insert({
          user_id: userId,
          cartao_id: cartaoId,
          descricao: descricao.trim(),
          valor: v,
          data,
          categoria: categoria.trim() || 'Outros',
          parcelada: false,
        })
      }
      router.back()
    } catch (e) {
      console.error('Erro ao salvar compra:', e)
      Alert.alert('Erro', 'Não foi possível salvar a compra.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={styles.input}
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Ex.: Supermercado"
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
        <Text style={styles.label}>Categoria</Text>
        <TextInput
          style={styles.input}
          value={categoria}
          onChangeText={setCategoria}
          placeholder="Outros"
          placeholderTextColor="rgba(255,255,255,0.4)"
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.checkRow, parcelada && styles.checkRowActive]}
          onPress={() => setParcelada(!parcelada)}
          disabled={loading}
        >
          <Text style={styles.checkLabel}>Compra parcelada</Text>
          <View style={[styles.checkbox, parcelada && styles.checkboxActive]} />
        </TouchableOpacity>
        {parcelada && (
          <>
            <Text style={styles.label}>Número de parcelas</Text>
            <TextInput
              style={styles.input}
              value={totalParcelas}
              onChangeText={setTotalParcelas}
              placeholder="2"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="number-pad"
              editable={!loading}
            />
          </>
        )}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSalvar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Salvar compra</Text>
          )}
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
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16,
  },
  checkRowActive: {},
  checkLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 16 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  checkboxActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
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
