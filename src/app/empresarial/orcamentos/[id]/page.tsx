'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import { FiArrowLeft, FiEdit, FiDownload } from 'react-icons/fi'
import Image from 'next/image'

interface Orcamento {
  id: string
  numero: string
  data_emissao: string
  data_validade: string | null
  status: string
  valor_total: number
  desconto: number
  valor_final: number
  observacoes: string | null
  condicoes_pagamento: string | null
  prazo_entrega: string | null
  cliente_nome: string | null
  cliente_email: string | null
  cliente_telefone: string | null
  cliente_endereco: string | null
  cor_primaria: string
  cor_secundaria: string
  logo_url: string | null
  cabecalho_personalizado: string | null
  rodape_personalizado: string | null
}

interface ItemOrcamento {
  id: string
  item_numero: number
  descricao: string
  quantidade: number
  unidade: string
  valor_unitario: number
  desconto: number
  valor_total: number
  observacoes: string | null
}

export default function VisualizarOrcamentoPage() {
  const { session } = useAuth()
  const router = useRouter()
  const params = useParams()
  const orcamentoId = params.id as string

  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const [itens, setItens] = useState<ItemOrcamento[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dados do template e perfil
  const [templateConfig, setTemplateConfig] = useState<any>(null)
  const [perfilData, setPerfilData] = useState<any>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [empresaNome, setEmpresaNome] = useState<string>('')

  useEffect(() => {
    if (session && orcamentoId) {
      loadOrcamento()
    }
  }, [session, orcamentoId])

  const loadOrcamento = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      // Carregar template de estilo
      if (typeof window !== 'undefined') {
        const estiloSalvo = localStorage.getItem(`orcamento_template_${userId}`)
        if (estiloSalvo) {
          try {
            setTemplateConfig(JSON.parse(estiloSalvo))
          } catch (e) {
            console.error('Erro ao carregar template:', e)
          }
        }
      }

      // Carregar perfil
      const { data: perfil } = await supabase
        .from('perfis')
        .select('empresa_nome, empresa_cnpj, telefone, celular, endereco, logo_empresa_url')
        .eq('user_id', userId)
        .single()

      if (perfil) {
        setPerfilData(perfil)
        setEmpresaNome(perfil.empresa_nome || templateConfig?.empresaNome || 'Nome da Empresa')
        setLogoUrl(templateConfig?.logoUrl || perfil.logo_empresa_url || null)
      }

      // Carregar orçamento
      const { data: orcamentoData, error: orcamentoError } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('id', orcamentoId)
        .eq('user_id', userId)
        .single()

      if (orcamentoError) throw orcamentoError
      setOrcamento(orcamentoData)

      // Carregar itens
      const { data: itensData, error: itensError } = await supabase
        .from('orcamento_itens')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .eq('user_id', userId)
        .order('item_numero', { ascending: true })

      if (itensError) throw itensError
      setItens(itensData || [])
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error)
      alert('Erro ao carregar orçamento')
      router.push('/empresarial/orcamentos')
    } finally {
      setLoading(false)
    }
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'em_processo':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'cancelado':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      concluido: 'Concluído',
      em_processo: 'Em processo',
      cancelado: 'Cancelado',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <MainLayoutEmpresarial>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-white text-xl">Carregando...</div>
        </div>
      </MainLayoutEmpresarial>
    )
  }

  if (!orcamento) {
    return (
      <MainLayoutEmpresarial>
        <div className="text-center py-12">
          <p className="text-gray-400 text-xl">Orçamento não encontrado</p>
          <button
            onClick={() => router.push('/empresarial/orcamentos')}
            className="mt-4 px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white rounded-lg"
          >
            Voltar
          </button>
        </div>
      </MainLayoutEmpresarial>
    )
  }

  return (
    <MainLayoutEmpresarial>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/empresarial/orcamentos')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Orçamento {orcamento.numero}</h1>
              <p className="text-gray-400">Visualização do orçamento</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push(`/empresarial/orcamentos/${orcamentoId}/editar`)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <FiEdit className="w-5 h-5" />
              <span>Editar</span>
            </button>
            <button
              onClick={() => router.push(`/empresarial/orcamentos/${orcamentoId}/pdf`)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <FiDownload className="w-5 h-5" />
              <span>Baixar PDF</span>
            </button>
          </div>
        </div>

        {/* Preview do Orçamento */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Preview do Orçamento</h2>
          
          {templateConfig && orcamento && (
            <div
              className="rounded-lg shadow-lg p-8"
              style={{
                fontFamily: templateConfig.fonteFamilia || 'Arial',
                backgroundColor: templateConfig.corFundo || '#FFFFFF',
              }}
            >
              {/* Usar valores do template ou padrões consistentes com a página de estilo */}
              {(() => {
                const corPrimaria = templateConfig.corPrimaria || '#111827'
                const corSecundaria = templateConfig.corSecundaria || '#111827'
                const corTexto = templateConfig.corTexto || '#111827'
                const corFundo = templateConfig.corFundo || '#FFFFFF'
                const corBordas = templateConfig.corBordas || '#111827'
                const corHeader = templateConfig.corHeader || '#FFFFFF'
                const corTextoHeader = templateConfig.corTextoHeader || '#111827'
                const fonteTituloHeader = templateConfig.fonteTituloHeader || 18
                const fonteTituloSecao = templateConfig.fonteTituloSecao || 12
                const paddingHeader = 16
                const espacamentoSecoes = 16
                
                return (
                  <>
                    {/* Header */}
                    <div
                    style={{
                      backgroundColor: corHeader,
                      color: corTextoHeader,
                      padding: `${paddingHeader}px`,
                      borderBottom: `2px solid ${corPrimaria}`,
                      marginBottom: `${espacamentoSecoes}px`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: logoUrl ? '140px' : 'auto',
                    }}
                  >
                {/* Logo à esquerda */}
                {logoUrl && (
                  <div className="relative w-[120px] h-[120px] flex items-center justify-center">
                    <Image
                      key={logoUrl}
                      src={logoUrl}
                      alt="Logo"
                      width={120}
                      height={120}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )}

                {/* Nome da empresa e datas à direita */}
                <div className="flex flex-col items-end justify-center flex-1 ml-6">
                    <h1
                      style={{
                        fontSize: `${fonteTituloHeader}px`,
                        fontWeight: 'bold',
                        color: corTextoHeader,
                        marginBottom: '8px',
                        textAlign: 'right',
                      }}
                    >
                      {empresaNome || 'Nome da Empresa'}
                    </h1>
                    <div
                      style={{
                        fontSize: '12px',
                        color: corTextoHeader,
                        textAlign: 'right',
                      }}
                    >
                      EMISSÃO: {formatarData(orcamento.data_emissao)} • VALIDADE:{' '}
                      {orcamento.data_validade ? formatarData(orcamento.data_validade) : 'Não informada'}
                    </div>
                  </div>
                </div>

                {/* Prestador e Cliente */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: `${espacamentoSecoes}px`,
                    marginBottom: `${espacamentoSecoes}px`,
                    padding: '20px',
                    border: `1px solid ${corBordas}`,
                    borderRadius: '4px',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: `${fonteTituloSecao}px`,
                        fontWeight: 'bold',
                        color: corSecundaria,
                        marginBottom: '8px',
                      }}
                    >
                      PRESTADOR
                    </h3>
                    {perfilData?.empresa_nome && (
                      <p style={{ color: corTexto, fontSize: '12px' }}>
                        EMPRESA: {perfilData.empresa_nome}
                      </p>
                    )}
                    {perfilData?.empresa_cnpj && (
                      <p style={{ color: corTexto, fontSize: '12px' }}>
                        CNPJ: {perfilData.empresa_cnpj}
                      </p>
                    )}
                    {session?.user?.email && (
                      <p style={{ color: corTexto, fontSize: '12px' }}>
                        EMAIL: {session.user.email}
                      </p>
                    )}
                    {perfilData?.telefone && (
                      <p style={{ color: corTexto, fontSize: '12px' }}>
                        TELEFONE: {perfilData.telefone}
                      </p>
                    )}
                    {perfilData?.celular && (
                      <p style={{ color: corTexto, fontSize: '12px' }}>
                        CELULAR: {perfilData.celular}
                      </p>
                    )}
                    {perfilData?.endereco && (
                      <p style={{ color: corTexto, fontSize: '12px' }}>
                        ENDEREÇO: {perfilData.endereco}
                      </p>
                    )}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: `${fonteTituloSecao}px`,
                        fontWeight: 'bold',
                        color: corSecundaria,
                        marginBottom: '8px',
                      }}
                    >
                      CLIENTE
                    </h3>
                    {orcamento.cliente_nome && (
                      <p style={{ color: corTexto, fontSize: '12px' }}>
                        NOME: {orcamento.cliente_nome}
                      </p>
                    )}
                    {orcamento.cliente_email && (
                      <p style={{ color: corTexto, fontSize: '12px' }}>
                        EMAIL: {orcamento.cliente_email}
                      </p>
                    )}
                    {orcamento.cliente_telefone && (
                      <p style={{ color: corTexto, fontSize: '12px' }}>
                        TELEFONE: {orcamento.cliente_telefone}
                      </p>
                    )}
                    {orcamento.cliente_endereco && (
                      <p style={{ color: corTexto, fontSize: '12px' }}>
                        ENDEREÇO: {orcamento.cliente_endereco}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tabela de Produtos */}
                <div style={{ marginBottom: `${espacamentoSecoes}px` }}>
                  <h3
                    style={{
                      fontSize: `${fonteTituloSecao}px`,
                      fontWeight: 'bold',
                      color: corSecundaria,
                      marginBottom: '8px',
                    }}
                  >
                    PRODUTOS/SERVIÇOS
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${corBordas}` }}>
                    <thead>
                      <tr style={{ backgroundColor: corPrimaria + '20' }}>
                        <th style={{ padding: '8px', textAlign: 'left', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                          QTD.
                        </th>
                        <th style={{ padding: '8px', textAlign: 'left', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                          DESCRIÇÃO
                        </th>
                        <th style={{ padding: '8px', textAlign: 'right', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                          VALOR
                        </th>
                        <th style={{ padding: '8px', textAlign: 'right', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                          SUBTOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item, index) => (
                        <tr key={item.id}>
                          <td style={{ padding: '8px', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                            {item.quantidade}
                          </td>
                          <td style={{ padding: '8px', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                            {item.descricao}
                          </td>
                          <td style={{ padding: '8px', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px', textAlign: 'right' }}>
                            {formatarMoeda(item.valor_unitario)}
                          </td>
                          <td style={{ padding: '8px', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px', textAlign: 'right' }}>
                            {formatarMoeda(item.valor_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totais */}
                <div
                  style={{
                    marginBottom: `${espacamentoSecoes}px`,
                    padding: '20px',
                    border: `1px solid ${corBordas}`,
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: corTexto, fontSize: '12px' }}>Quantidade Total: {itens.reduce((sum, item) => sum + item.quantidade, 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: corTexto, fontSize: '12px' }}>Subtotal:</span>
                    <span style={{ color: corTexto, fontSize: '12px' }}>
                      {formatarMoeda(orcamento.valor_total)}
                    </span>
                  </div>
                  {orcamento.desconto > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: corTexto, fontSize: '12px' }}>Desconto:</span>
                      <span style={{ color: corTexto, fontSize: '12px' }}>
                        {formatarMoeda(orcamento.desconto)}
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: `1px solid ${corBordas}`,
                    }}
                  >
                    <span style={{ color: corTexto, fontSize: '14px', fontWeight: 'bold' }}>TOTAL:</span>
                    <span style={{ color: corTexto, fontSize: '14px', fontWeight: 'bold' }}>
                      {formatarMoeda(orcamento.valor_final)}
                    </span>
                  </div>
                </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </MainLayoutEmpresarial>
  )
}
