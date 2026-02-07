'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/Layout/MainLayout'
import { supabasePessoal as supabase } from '@/lib/supabase/pessoal'
import { useAuth } from '@/app/pessoal/providers'
import { FiPlus, FiEdit, FiTrash2, FiTag, FiX } from 'react-icons/fi'

interface TipoGasto {
  id: string
  nome: string
  descricao: string | null
  cor: string
  user_id: string
}

export default function CategoriasPage() {
  const { session } = useAuth()
  const [tiposGastos, setTiposGastos] = useState<TipoGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [showTipoModal, setShowTipoModal] = useState(false)
  const [editingTipo, setEditingTipo] = useState<TipoGasto | null>(null)
  const [tipoFormData, setTipoFormData] = useState({
    nome: '',
    nomeSelecionado: '',
    descricao: '',
    cor: '#6b7280',
  })

  // Sugestões de nomes para tipos de gastos
  const sugestoesTiposGastos = [
    'Alimentação',
    'Transporte',
    'Moradia',
    'Saúde',
    'Educação',
    'Lazer',
    'Vestuário',
    'Tecnologia',
    'Contas',
    'Seguros',
    'Investimentos',
    'Doações',
    'Viagens',
    'Pet',
    'Casa',
    'Trabalho',
    'Outros',
    'PERSONALIZADO'
  ]

  useEffect(() => {
    if (session) {
      loadTiposGastos()
    }
  }, [session])

  function loadTiposGastos() {
    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from('tipos_gastos')
          .select('*')
          .eq('user_id', session?.user?.id)
          .order('nome')

        if (error) throw error
        setTiposGastos(data || [])
      } catch (error) {
        console.error('Erro ao carregar tipos de gastos:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }

  function handleTipoSubmit(e: React.FormEvent) {
    e.preventDefault()
    async function submitData() {
      try {
        // Determinar o nome final (da seleção ou personalizado)
        const nomeFinal = tipoFormData.nomeSelecionado === 'PERSONALIZADO' || !tipoFormData.nomeSelecionado
          ? tipoFormData.nome
          : tipoFormData.nomeSelecionado

        const tipoData = {
          nome: nomeFinal,
          descricao: tipoFormData.descricao || null,
          cor: tipoFormData.cor,
          user_id: session?.user?.id,
        }

        if (editingTipo) {
          const { error } = await supabase
            .from('tipos_gastos')
            .update(tipoData)
            .eq('id', editingTipo.id)

          if (error) throw error
        } else {
          const { error } = await supabase.from('tipos_gastos').insert([tipoData])
          if (error) throw error
        }

        setShowTipoModal(false)
        setEditingTipo(null)
        setTipoFormData({
          nome: '',
          nomeSelecionado: '',
          descricao: '',
          cor: '#6b7280',
        })
        loadTiposGastos()
      } catch (error) {
        console.error('Erro ao salvar tipo de gasto:', error)
        alert('Erro ao salvar categoria')
      }
    }
    submitData()
  }

  function handleEditTipo(tipo: TipoGasto) {
    setEditingTipo(tipo)
    const nomeNaLista = sugestoesTiposGastos.find(s => s === tipo.nome)
    setTipoFormData({
      nome: tipo.nome,
      nomeSelecionado: nomeNaLista ? tipo.nome : (tipo.nome ? 'PERSONALIZADO' : ''),
      descricao: tipo.descricao || '',
      cor: tipo.cor,
    })
    setShowTipoModal(true)
  }

  function handleDeleteTipo(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta categoria? As compras associadas não serão excluídas.')) return

    async function deleteData() {
      try {
        const { error } = await supabase.from('tipos_gastos').delete().eq('id', id)
        if (error) throw error
        loadTiposGastos()
      } catch (error) {
        console.error('Erro ao excluir categoria:', error)
        alert('Erro ao excluir categoria')
      }
    }
    deleteData()
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-white">Carregando...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Categorias</h1>
            <p className="text-gray-400">
              Gerencie suas categorias de gastos
            </p>
          </div>
          <button
            onClick={() => {
              setEditingTipo(null)
              setTipoFormData({
                nome: '',
                nomeSelecionado: '',
                descricao: '',
                cor: '#6b7280',
              })
              setShowTipoModal(true)
            }}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
          >
            <FiPlus className="w-5 h-5" />
            <span>Adicionar Categoria</span>
          </button>
        </div>

        {tiposGastos.length === 0 ? (
          <div className="bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-700">
            <FiTag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">
              Nenhuma categoria cadastrada
            </p>
            <p className="text-gray-500 text-sm">
              Crie categorias para organizar suas compras
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiposGastos.map((tipo) => (
              <div
                key={tipo.id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${tipo.cor}20`,
                        border: `2px solid ${tipo.cor}40`,
                      }}
                    >
                      <FiTag
                        className="w-5 h-5"
                        style={{ color: tipo.cor }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white">
                        {tipo.nome}
                      </h3>
                      {tipo.descricao && (
                        <p className="text-sm text-gray-400 truncate">
                          {tipo.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-2">
                    <button
                      onClick={() => handleEditTipo(tipo)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Editar"
                    >
                      <FiEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTipo(tipo.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Excluir"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Categoria */}
        {showTipoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingTipo ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>
                <button
                  onClick={() => {
                    setShowTipoModal(false)
                    setEditingTipo(null)
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleTipoSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome da Categoria
                  </label>
                  <select
                    value={tipoFormData.nomeSelecionado}
                    onChange={(e) => {
                      const valor = e.target.value
                      setTipoFormData({ 
                        ...tipoFormData, 
                        nomeSelecionado: valor,
                        nome: valor === 'PERSONALIZADO' ? tipoFormData.nome : (valor || '')
                      })
                    }}
                    required={!tipoFormData.nome}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                  >
                    <option value="">Selecione uma opção...</option>
                    {sugestoesTiposGastos.map((sugestao) => (
                      <option key={sugestao} value={sugestao}>
                        {sugestao === 'PERSONALIZADO' ? '✏️ Personalizado' : sugestao}
                      </option>
                    ))}
                  </select>
                  {(tipoFormData.nomeSelecionado === 'PERSONALIZADO' || (!tipoFormData.nomeSelecionado && tipoFormData.nome)) && (
                    <input
                      type="text"
                      value={tipoFormData.nome}
                      onChange={(e) =>
                        setTipoFormData({ ...tipoFormData, nome: e.target.value })
                      }
                      required={tipoFormData.nomeSelecionado === 'PERSONALIZADO'}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Digite o nome personalizado..."
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição (opcional)
                  </label>
                  <input
                    type="text"
                    value={tipoFormData.descricao}
                    onChange={(e) =>
                      setTipoFormData({ ...tipoFormData, descricao: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Descrição da categoria..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cor
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={tipoFormData.cor}
                      onChange={(e) =>
                        setTipoFormData({ ...tipoFormData, cor: e.target.value })
                      }
                      className="w-16 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={tipoFormData.cor}
                      onChange={(e) =>
                        setTipoFormData({ ...tipoFormData, cor: e.target.value })
                      }
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="#6b7280"
                    />
                  </div>
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTipoModal(false)
                      setEditingTipo(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
