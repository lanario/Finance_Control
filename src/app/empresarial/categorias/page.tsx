'use client'

import { useEffect, useState, useCallback } from 'react'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import {
  FiPlus,
  FiX,
  FiTag,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi'

interface Categoria {
  id: string
  nome: string
  descricao: string | null
  cor: string
  tipo: 'despesa' | 'receita'
  ativo: boolean
  created_at?: string
  updated_at?: string
}

const CORES_PREDEFINIDAS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7',
]

export default function CategoriasPage() {
  const { session } = useAuth()
  const [categoriasReceita, setCategoriasReceita] = useState<Categoria[]>([])
  const [categoriasDespesa, setCategoriasDespesa] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: '#6366f1',
    tipo: 'despesa' as 'despesa' | 'receita',
  })

  const loadCategorias = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', userId)
        .order('nome', { ascending: true })

      if (error) throw error
      const list = (data as Categoria[]) || []
      setCategoriasReceita(list.filter((c) => c.tipo === 'receita'))
      setCategoriasDespesa(list.filter((c) => c.tipo === 'despesa'))
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
      setCategoriasReceita([])
      setCategoriasDespesa([])
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session) {
      setLoading(true)
      loadCategorias()
    }
  }, [session, loadCategorias])

  function openNew(tipo: 'receita' | 'despesa') {
    setEditingCategoria(null)
    setFormData({
      nome: '',
      descricao: '',
      cor: CORES_PREDEFINIDAS[0],
      tipo,
    })
    setShowModal(true)
  }

  function handleEdit(cat: Categoria) {
    setEditingCategoria(cat)
    setFormData({
      nome: cat.nome,
      descricao: cat.descricao || '',
      cor: cat.cor || '#6366f1',
      tipo: cat.tipo,
    })
    setShowModal(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    async function submit() {
      try {
        const userId = session?.user?.id
        if (!userId) return

        const payload = {
          user_id: userId,
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || null,
          cor: formData.cor,
          tipo: formData.tipo,
          ativo: true,
          updated_at: new Date().toISOString(),
        }

        if (editingCategoria) {
          const { error } = await supabase
            .from('categorias')
            .update(payload)
            .eq('id', editingCategoria.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('categorias').insert(payload)
          if (error) throw error
        }

        setShowModal(false)
        setEditingCategoria(null)
        loadCategorias()
      } catch (error: unknown) {
        console.error('Erro ao salvar categoria:', error)
        const err = error as { code?: string }
        if (err?.code === '23505') {
          alert('Já existe uma categoria com este nome para este tipo.')
        } else {
          alert('Erro ao salvar categoria. Tente novamente.')
        }
      }
    }
    submit()
  }

  function handleDelete(id: string) {
    if (!confirm('Excluir esta categoria? Itens vinculados podem ficar sem categoria.')) return
    async function del() {
      try {
        const { error } = await supabase.from('categorias').delete().eq('id', id)
        if (error) throw error
        loadCategorias()
      } catch (error) {
        console.error('Erro ao excluir categoria:', error)
        alert('Erro ao excluir. A categoria pode estar em uso.')
      }
    }
    del()
  }

  function renderListaCategorias(categorias: Categoria[]) {
    if (categorias.length === 0) {
      return (
        <p className="text-gray-500 text-sm py-4">
          Nenhuma categoria cadastrada. Clique em &quot;+ Nova&quot; para adicionar.
        </p>
      )
    }
    return (
      <ul className="divide-y divide-gray-700">
        {categorias.map((cat) => (
          <li
            key={cat.id}
            className="flex items-center gap-3 py-4 first:pt-0"
          >
            <div
              className="w-4 h-4 rounded-full shrink-0 border border-gray-600"
              style={{ backgroundColor: cat.cor || '#6366f1' }}
              title={cat.cor || ''}
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white">{cat.nome}</p>
              {cat.descricao && (
                <p className="text-sm text-gray-400 mt-0.5">{cat.descricao}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleEdit(cat)}
                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-colors"
                title="Editar"
              >
                <FiEdit2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(cat.id)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                title="Excluir"
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  if (loading && categoriasReceita.length === 0 && categoriasDespesa.length === 0) {
    return (
      <MainLayoutEmpresarial>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-white text-xl">Carregando...</div>
        </div>
      </MainLayoutEmpresarial>
    )
  }

  return (
    <MainLayoutEmpresarial>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Categorias</h1>
          <p className="text-gray-400">
            Gerencie categorias de receitas e despesas
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Categorias de Receitas */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Categorias de Receitas</h2>
              <button
                type="button"
                onClick={() => openNew('receita')}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Nova
              </button>
            </div>
            {renderListaCategorias(categoriasReceita)}
          </div>

          {/* Card Categorias de Despesas */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Categorias de Despesas</h2>
              <button
                type="button"
                onClick={() => openNew('despesa')}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Nova
              </button>
            </div>
            {renderListaCategorias(categoriasDespesa)}
          </div>
        </div>
      </div>

      {/* Modal Nova/Editar Categoria */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FiTag className="w-5 h-5" />
                {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  setEditingCategoria(null)
                }}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      checked={formData.tipo === 'despesa'}
                      onChange={() => setFormData((f) => ({ ...f, tipo: 'despesa' }))}
                      className="rounded border-gray-600 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-gray-300">Despesa</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      checked={formData.tipo === 'receita'}
                      onChange={() => setFormData((f) => ({ ...f, tipo: 'receita' }))}
                      className="rounded border-gray-600 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-gray-300">Receita</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData((f) => ({ ...f, nome: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: Marketing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descrição (opcional)</label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData((f) => ({ ...f, descricao: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Breve descrição"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cor (para gráficos)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {CORES_PREDEFINIDAS.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, cor }))}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        formData.cor === cor ? 'border-white ring-2 ring-offset-2 ring-offset-gray-800 ring-white' : 'border-gray-600'
                      }`}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData((f) => ({ ...f, cor: e.target.value }))}
                    className="w-12 h-10 rounded cursor-pointer border border-gray-600 bg-transparent"
                  />
                  <input
                    type="text"
                    value={formData.cor}
                    onChange={(e) => setFormData((f) => ({ ...f, cor: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="#6366f1"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingCategoria(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  {editingCategoria ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayoutEmpresarial>
  )
}
