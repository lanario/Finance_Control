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
  FiBriefcase,
  FiMail,
  FiCheck,
  FiXCircle,
  FiPhone,
  FiMapPin,
  FiUser,
} from 'react-icons/fi'
import ActionButtons from '@/components/Empresarial/ActionButtons'

interface Fornecedor {
  id: string
  nome: string
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

export default function FornecedoresPage() {
  const { session } = useAuth()
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null)
  const [buscaTexto, setBuscaTexto] = useState<string>('')
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativos' | 'inativos'>('todos')

  // Formulário
  const [formData, setFormData] = useState({
    nome: '',
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
      loadFornecedores()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when session changes
  }, [session])

  useEffect(() => {
    if (session) {
      loadFornecedores()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when filters or session change
  }, [buscaTexto, filtroAtivo, session])

  const loadFornecedores = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      let query = supabase
        .from('fornecedores')
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

      let fornecedoresFiltrados = data || []

      // Aplicar busca por texto
      if (buscaTexto) {
        const buscaLower = buscaTexto.toLowerCase()
        fornecedoresFiltrados = fornecedoresFiltrados.filter(
          (fornecedor) =>
            fornecedor.nome.toLowerCase().includes(buscaLower) ||
            fornecedor.cnpj?.toLowerCase().includes(buscaLower) ||
            fornecedor.cpf?.toLowerCase().includes(buscaLower) ||
            fornecedor.email?.toLowerCase().includes(buscaLower) ||
            fornecedor.telefone?.toLowerCase().includes(buscaLower)
        )
      }

      setFornecedores(fornecedoresFiltrados)
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      if (!userId) return

      // Validação: deve ter CNPJ ou CPF, mas não ambos
      if (formData.cnpj && formData.cpf) {
        alert('Informe apenas CNPJ ou CPF, não ambos.')
        return
      }

      const fornecedorData = {
        user_id: userId,
        nome: formData.nome,
        cnpj: formData.cnpj || null,
        cpf: formData.cpf || null,
        email: formData.email || null,
        telefone: formData.telefone || null,
        endereco: formData.endereco || null,
        observacoes: formData.observacoes || null,
        ativo: formData.ativo,
      }

      if (editingFornecedor) {
        // Editar fornecedor existente
        const { error } = await supabase
          .from('fornecedores')
          .update(fornecedorData)
          .eq('id', editingFornecedor.id)

        if (error) throw error
      } else {
        // Criar novo fornecedor
        const { error } = await supabase.from('fornecedores').insert(fornecedorData)

        if (error) throw error
      }

      setShowModal(false)
      setEditingFornecedor(null)
      resetForm()
      loadFornecedores()
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error)
      alert('Erro ao salvar fornecedor')
    }
  }

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor)
    setFormData({
      nome: fornecedor.nome,
      cnpj: fornecedor.cnpj || '',
      cpf: fornecedor.cpf || '',
      email: fornecedor.email || '',
      telefone: fornecedor.telefone || '',
      endereco: fornecedor.endereco || '',
      observacoes: fornecedor.observacoes || '',
      ativo: fornecedor.ativo,
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return

    try {
      const { error } = await supabase.from('fornecedores').delete().eq('id', id)
      if (error) throw error

      loadFornecedores()
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error)
      alert('Erro ao excluir fornecedor')
    }
  }

  const handleToggleAtivo = async (fornecedor: Fornecedor) => {
    try {
      const { error } = await supabase
        .from('fornecedores')
        .update({ ativo: !fornecedor.ativo })
        .eq('id', fornecedor.id)

      if (error) throw error

      loadFornecedores()
    } catch (error) {
      console.error('Erro ao alterar status do fornecedor:', error)
      alert('Erro ao alterar status do fornecedor')
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      cnpj: '',
      cpf: '',
      email: '',
      telefone: '',
      endereco: '',
      observacoes: '',
      ativo: true,
    })
    setEditingFornecedor(null)
  }

  const formatarCNPJ = (cnpj: string) => {
    if (!cnpj) return ''
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  const formatarCPF = (cpf: string) => {
    if (!cpf) return ''
    const cpfLimpo = cpf.replace(/\D/g, '')
    return cpfLimpo.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  }

  const formatarTelefone = (telefone: string) => {
    if (!telefone) return ''
    const telefoneLimpo = telefone.replace(/\D/g, '')
    if (telefoneLimpo.length === 11) {
      return telefoneLimpo.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
    } else if (telefoneLimpo.length === 10) {
      return telefoneLimpo.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
    }
    return telefone
  }

  const fornecedoresAtivos = fornecedores.filter((f) => f.ativo).length
  const fornecedoresInativos = fornecedores.filter((f) => !f.ativo).length

  if (loading) {
    return (
      <MainLayoutEmpresarial>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse emp-text-primary text-xl">Carregando...</div>
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
            <h1 className="text-3xl font-bold emp-text-primary mb-2">Fornecedores</h1>
            <p className="emp-text-secondary">Gerencie todos os fornecedores da sua empresa</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors emp-text-primary hover:opacity-90"
            style={{ backgroundColor: 'var(--emp-accent)' }}
          >
            <FiPlus className="w-5 h-5" />
            <span>Novo Fornecedor</span>
          </button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="emp-bg-card rounded-lg p-4 border emp-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="emp-text-muted text-sm">Total de Fornecedores</p>
                <p className="text-2xl font-bold emp-text-primary mt-1">{fornecedores.length}</p>
              </div>
              <FiBriefcase className="w-8 h-8 text-neon" />
            </div>
          </div>

          <div className="emp-bg-card rounded-lg p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="emp-text-muted text-sm">Ativos</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{fornecedoresAtivos}</p>
              </div>
              <FiCheck className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="emp-bg-card rounded-lg p-4 border border-red-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="emp-text-muted text-sm">Inativos</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{fornecedoresInativos}</p>
              </div>
              <FiXCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="emp-bg-card rounded-lg p-4 border emp-border">
          <div className="flex items-center space-x-2 mb-4">
            <FiFilter className="w-5 h-5 emp-text-muted" />
            <h2 className="text-lg font-semibold emp-text-primary">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Busca por texto */}
            <div>
              <label className="block text-sm emp-text-muted mb-1">Buscar</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 emp-text-muted w-4 h-4" />
                <input
                  type="text"
                  placeholder="Nome, CNPJ, CPF, email..."
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                />
              </div>
            </div>

            {/* Filtro por status */}
            <div>
              <label className="block text-sm emp-text-muted mb-1">Status</label>
              <select
                value={filtroAtivo}
                onChange={(e) => setFiltroAtivo(e.target.value as any)}
                className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
              >
                <option value="todos">Todos</option>
                <option value="ativos">Ativos</option>
                <option value="inativos">Inativos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Fornecedores */}
        <div className="emp-bg-card rounded-lg border emp-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="emp-input-bg">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-secondary uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-secondary uppercase tracking-wider">
                    CNPJ/CPF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-secondary uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-secondary uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-secondary uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--emp-border)]">
                {fornecedores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center emp-text-muted">
                      Nenhum fornecedor encontrado
                    </td>
                  </tr>
                ) : (
                  fornecedores.map((fornecedor) => (
                    <tr key={fornecedor.id} className="transition-colors hover:opacity-90">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium emp-text-primary">{fornecedor.nome}</div>
                        {fornecedor.endereco && (
                          <div className="text-xs emp-text-muted mt-1 flex items-center">
                            <FiMapPin className="w-3 h-3 mr-1" />
                            {fornecedor.endereco}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm emp-text-secondary">
                        {fornecedor.cnpj ? formatarCNPJ(fornecedor.cnpj) : fornecedor.cpf ? formatarCPF(fornecedor.cpf) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm emp-text-secondary">
                        {fornecedor.email ? (
                          <div className="flex items-center">
                            <FiMail className="w-4 h-4 mr-2" />
                            {fornecedor.email}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm emp-text-secondary">
                        {fornecedor.telefone ? (
                          <div className="flex items-center">
                            <FiPhone className="w-4 h-4 mr-2" />
                            {formatarTelefone(fornecedor.telefone)}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {fornecedor.ativo ? (
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
                          onEdit={() => handleEdit(fornecedor)}
                          onDelete={() => handleDelete(fornecedor.id)}
                          onToggleActive={() => handleToggleAtivo(fornecedor)}
                          isActive={fornecedor.ativo}
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
            <div className="emp-bg-card rounded-lg border emp-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold emp-text-primary">
                    {editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="emp-text-muted hover:emp-text-primary transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm emp-text-muted mb-1">
                      Nome / Razão Social *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                      placeholder="Nome do fornecedor"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm emp-text-muted mb-1">CNPJ</label>
                      <input
                        type="text"
                        value={formData.cnpj}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/\D/g, '')
                          if (valor.length <= 14) {
                            setFormData({ ...formData, cnpj: valor, cpf: '' })
                          }
                        }}
                        className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                      {formData.cnpj && (
                        <p className="text-xs emp-text-muted mt-1">{formatarCNPJ(formData.cnpj)}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm emp-text-muted mb-1">CPF</label>
                      <input
                        type="text"
                        value={formData.cpf}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/\D/g, '')
                          if (valor.length <= 11) {
                            setFormData({ ...formData, cpf: valor, cnpj: '' })
                          }
                        }}
                        className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                      {formData.cpf && (
                        <p className="text-xs emp-text-muted mt-1">{formatarCPF(formData.cpf)}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm emp-text-muted mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                        placeholder="email@exemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm emp-text-muted mb-1">Telefone</label>
                      <input
                        type="text"
                        value={formData.telefone}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/\D/g, '')
                          if (valor.length <= 11) {
                            setFormData({ ...formData, telefone: valor })
                          }
                        }}
                        className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                      {formData.telefone && (
                        <p className="text-xs emp-text-muted mt-1">{formatarTelefone(formData.telefone)}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm emp-text-muted mb-1">Endereço</label>
                    <input
                      type="text"
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                      placeholder="Rua, número, bairro, cidade - UF"
                    />
                  </div>

                  <div>
                    <label className="block text-sm emp-text-muted mb-1">Observações</label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                      placeholder="Observações adicionais sobre o fornecedor..."
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.ativo}
                        onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                        className="w-4 h-4 rounded focus:ring-2 focus:ring-[var(--emp-accent)] emp-input-bg emp-border"
                      />
                      <span className="emp-text-primary">Fornecedor ativo</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        resetForm()
                      }}
                      className="px-4 py-2 emp-input-bg border emp-border emp-text-primary rounded-lg transition-colors hover:opacity-90"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg transition-colors emp-text-primary hover:opacity-90"
                      style={{ backgroundColor: 'var(--emp-accent)' }}
                    >
                      {editingFornecedor ? 'Salvar Alterações' : 'Criar Fornecedor'}
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

