'use client'

import { useEffect, useState } from 'react'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import {
  FiPlus,
  FiX,
  FiSearch,
  FiFilter,
  FiUsers,
  FiMail,
  FiPhone,
  FiMapPin,
  FiUser,
  FiCheck,
  FiXCircle,
} from 'react-icons/fi'
import ActionButtons from '@/components/Empresarial/ActionButtons'

interface Cliente {
  id: string
  nome: string
  razao_social: string | null
  cnpj: string | null
  cpf: string | null
  email: string | null
  telefone: string | null
  endereco: string | null
  observacoes: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export default function ClientesPage() {
  const { session } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [buscaTexto, setBuscaTexto] = useState<string>('')
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativos' | 'inativos'>('todos')

  // Formulário
  const [formData, setFormData] = useState({
    nome: '',
    razao_social: '',
    cnpj: '',
    cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    observacoes: '',
    ativo: true,
  })

  useEffect(() => {
    if (session) {
      loadClientes()
    }
  }, [session])

  useEffect(() => {
    if (session) {
      loadClientes()
    }
  }, [buscaTexto, filtroAtivo, session])

  function loadClientes() {
    async function load() {
      try {
        const userId = session?.user?.id
        if (!userId) return

        let query = supabase
          .from('clientes')
          .select('*')
          .eq('user_id', userId)
          .order('nome', { ascending: true })

        // Aplicar filtro de ativo
        if (filtroAtivo === 'ativos') {
          query = query.eq('ativo', true)
        } else if (filtroAtivo === 'inativos') {
          query = query.eq('ativo', false)
        }

        const { data, error } = await query

        if (error) throw error

        let clientesFiltrados = data || []

        // Aplicar busca por texto
        if (buscaTexto) {
          const buscaLower = buscaTexto.toLowerCase()
          clientesFiltrados = clientesFiltrados.filter(
            (cliente) =>
              cliente.nome.toLowerCase().includes(buscaLower) ||
              cliente.razao_social?.toLowerCase().includes(buscaLower) ||
              cliente.cnpj?.toLowerCase().includes(buscaLower) ||
              cliente.cpf?.toLowerCase().includes(buscaLower) ||
              cliente.email?.toLowerCase().includes(buscaLower) ||
              cliente.telefone?.toLowerCase().includes(buscaLower)
          )
        }

        setClientes(clientesFiltrados)
      } catch (error) {
        console.error('Erro ao carregar clientes:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }

  function handleSubmit(e: React.FormEvent) {
    async function submit() {
      e.preventDefault()
      try {
        const userId = session?.user?.id
        if (!userId) return

        // Validação: deve ter CNPJ ou CPF, mas não ambos
        if (formData.cnpj && formData.cpf) {
          alert('Informe apenas CNPJ ou CPF, não ambos.')
          return
        }

        const clienteData = {
          user_id: userId,
          nome: formData.nome,
          razao_social: formData.razao_social || null,
          cnpj: formData.cnpj || null,
          cpf: formData.cpf || null,
          email: formData.email || null,
          telefone: formData.telefone || null,
          endereco: formData.endereco || null,
          observacoes: formData.observacoes || null,
          ativo: formData.ativo,
        }

        if (editingCliente) {
          // Editar cliente existente
          const { error } = await supabase
            .from('clientes')
            .update(clienteData)
            .eq('id', editingCliente.id)

          if (error) throw error
        } else {
          // Criar novo cliente
          const { error } = await supabase.from('clientes').insert(clienteData)

          if (error) throw error
        }

        setShowModal(false)
        setEditingCliente(null)
        resetForm()
        loadClientes()
      } catch (error) {
        console.error('Erro ao salvar cliente:', error)
        alert('Erro ao salvar cliente')
      }
    }
    submit()
  }

  function handleEdit(cliente: Cliente) {
    setEditingCliente(cliente)
    setFormData({
      nome: cliente.nome,
      razao_social: cliente.razao_social || '',
      cnpj: cliente.cnpj || '',
      cpf: cliente.cpf || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      endereco: cliente.endereco || '',
      observacoes: cliente.observacoes || '',
      ativo: cliente.ativo,
    })
    setShowModal(true)
  }

  function handleDelete(id: string) {
    async function deleteCliente() {
      if (!confirm('Tem certeza que deseja excluir este cliente?')) return

      try {
        const { error } = await supabase.from('clientes').delete().eq('id', id)
        if (error) throw error

        loadClientes()
      } catch (error) {
        console.error('Erro ao excluir cliente:', error)
        alert('Erro ao excluir cliente')
      }
    }
    deleteCliente()
  }

  function handleToggleAtivo(cliente: Cliente) {
    async function toggle() {
      try {
        const { error } = await supabase
          .from('clientes')
          .update({ ativo: !cliente.ativo })
          .eq('id', cliente.id)

        if (error) throw error

        loadClientes()
      } catch (error) {
        console.error('Erro ao alterar status do cliente:', error)
        alert('Erro ao alterar status do cliente')
      }
    }
    toggle()
  }

  function resetForm() {
    setFormData({
      nome: '',
      razao_social: '',
      cnpj: '',
      cpf: '',
      email: '',
      telefone: '',
      endereco: '',
      observacoes: '',
      ativo: true,
    })
    setEditingCliente(null)
  }

  function formatarCNPJ(cnpj: string) {
    if (!cnpj) return ''
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  function formatarCPF(cpf: string) {
    if (!cpf) return ''
    const cpfLimpo = cpf.replace(/\D/g, '')
    return cpfLimpo.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  }

  function formatarTelefone(telefone: string) {
    if (!telefone) return ''
    const telefoneLimpo = telefone.replace(/\D/g, '')
    if (telefoneLimpo.length === 11) {
      return telefoneLimpo.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
    } else if (telefoneLimpo.length === 10) {
      return telefoneLimpo.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
    }
    return telefone
  }

  const clientesAtivos = clientes.filter((c) => c.ativo).length
  const clientesInativos = clientes.filter((c) => !c.ativo).length

  if (loading) {
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Clientes</h1>
            <p className="text-gray-400">Gerencie todos os clientes da sua empresa</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            <span>Novo Cliente</span>
          </button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de Clientes</p>
                <p className="text-2xl font-bold text-white mt-1">{clientes.length}</p>
              </div>
              <FiUsers className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Ativos</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{clientesAtivos}</p>
              </div>
              <FiCheck className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-red-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Inativos</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{clientesInativos}</p>
              </div>
              <FiXCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <FiFilter className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Busca por texto */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Buscar</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Nome, Razão Social, CNPJ, CPF, email..."
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Filtro por status */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={filtroAtivo}
                onChange={(e) => setFiltroAtivo(e.target.value as any)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="todos">Todos</option>
                <option value="ativos">Ativos</option>
                <option value="inativos">Inativos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Clientes */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Razão Social
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    CNPJ/CPF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                ) : (
                  clientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{cliente.nome}</div>
                        {cliente.endereco && (
                          <div className="text-xs text-gray-400 mt-1 flex items-center">
                            <FiMapPin className="w-3 h-3 mr-1" />
                            {cliente.endereco}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cliente.razao_social || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cliente.cnpj ? formatarCNPJ(cliente.cnpj) : cliente.cpf ? formatarCPF(cliente.cpf) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cliente.email ? (
                          <div className="flex items-center">
                            <FiMail className="w-4 h-4 mr-2" />
                            {cliente.email}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cliente.telefone ? (
                          <div className="flex items-center">
                            <FiPhone className="w-4 h-4 mr-2" />
                            {formatarTelefone(cliente.telefone)}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cliente.ativo ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                            Ativo
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <ActionButtons
                          onEdit={() => handleEdit(cliente)}
                          onDelete={() => handleDelete(cliente.id)}
                          onToggleActive={() => handleToggleAtivo(cliente)}
                          isActive={cliente.ativo}
                          showToggle={true}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Adicionar/Editar */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Nome / Nome Fantasia *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Nome do cliente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Razão Social</label>
                    <input
                      type="text"
                      value={formData.razao_social}
                      onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Razão social (para empresas)"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">CNPJ</label>
                      <input
                        type="text"
                        value={formData.cnpj}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/\D/g, '')
                          if (valor.length <= 14) {
                            setFormData({ ...formData, cnpj: valor, cpf: '' })
                          }
                        }}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                      {formData.cnpj && (
                        <p className="text-xs text-gray-500 mt-1">{formatarCNPJ(formData.cnpj)}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">CPF</label>
                      <input
                        type="text"
                        value={formData.cpf}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/\D/g, '')
                          if (valor.length <= 11) {
                            setFormData({ ...formData, cpf: valor, cnpj: '' })
                          }
                        }}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                      {formData.cpf && (
                        <p className="text-xs text-gray-500 mt-1">{formatarCPF(formData.cpf)}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="email@exemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                      <input
                        type="text"
                        value={formData.telefone}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/\D/g, '')
                          if (valor.length <= 11) {
                            setFormData({ ...formData, telefone: valor })
                          }
                        }}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                      {formData.telefone && (
                        <p className="text-xs text-gray-500 mt-1">{formatarTelefone(formData.telefone)}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Rua, número, bairro, cidade - UF"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Observações</label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Observações adicionais sobre o cliente..."
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.ativo}
                        onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-white">Cliente ativo</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        resetForm()
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      {editingCliente ? 'Salvar Alterações' : 'Criar Cliente'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayoutEmpresarial>
  )
}

