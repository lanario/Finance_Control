'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/Layout/MainLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import { FiChevronDown, FiChevronUp, FiShoppingCart, FiEdit, FiTrash2, FiDownload } from 'react-icons/fi'
import jsPDF from 'jspdf'

interface Compra {
  id: string
  descricao: string
  valor: number
  data: string
  cartao_id: string | null
  categoria: string
  metodo_pagamento: string
  user_id: string
}

interface Cartao {
  id: string
  nome: string
}

interface TipoGasto {
  id: string
  nome: string
  descricao: string | null
  cor: string
  user_id: string
}

interface GastosPorMes {
  ano: number
  mes: number
  mesNome: string
  total: number
  compras: Compra[]
}

const mesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function GastosPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [gastosPorMes, setGastosPorMes] = useState<GastosPorMes[]>([])
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [tiposGastos, setTiposGastos] = useState<TipoGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [mesesAbertos, setMesesAbertos] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (session) {
      loadDados()
    }
  }, [session])

  const loadDados = async () => {
    try {
      setLoading(true)
      const userId = session?.user?.id

      // Buscar cartões
      const { data: cartoesData } = await supabase
        .from('cartoes')
        .select('id, nome')
        .eq('user_id', userId)

      setCartoes(cartoesData || [])

      // Buscar tipos de gastos
      const { data: tiposData } = await supabase
        .from('tipos_gastos')
        .select('*')
        .eq('user_id', userId)

      setTiposGastos(tiposData || [])

      // Buscar todas as compras
      const { data: todasCompras, error } = await supabase
        .from('compras')
        .select('*')
        .eq('user_id', userId)
        .order('data', { ascending: false })

      if (error) throw error

      // Filtrar apenas compras NÃO parceladas (compras parceladas são representadas pelas parcelas)
      // Excluir compras onde parcelada = true OU total_parcelas > 1
      const compras = todasCompras?.filter(compra => {
        const isParcelada = compra.parcelada === true || (compra as any).total_parcelas > 1
        return !isParcelada
      }) || []

      // Buscar parcelas pendentes para incluir nos gastos mensais
      const { data: parcelas, error: parcelasError } = await supabase
        .from('parcelas')
        .select('*')
        .eq('user_id', userId)
        .eq('paga', false)
        .order('data_vencimento', { ascending: false })

      if (parcelasError) throw parcelasError

      // Agrupar compras por mês (baseado na data da compra)
      const gastosAgrupados: { [key: string]: GastosPorMes } = {}

      compras?.forEach((compra) => {
        const data = new Date(compra.data)
        const ano = data.getFullYear()
        const mes = data.getMonth() + 1
        const key = `${ano}-${mes}`

        if (!gastosAgrupados[key]) {
          gastosAgrupados[key] = {
            ano,
            mes,
            mesNome: mesesNomes[mes - 1],
            total: 0,
            compras: [],
          }
        }

        gastosAgrupados[key].compras.push(compra)
        gastosAgrupados[key].total += compra.valor
      })

      // Agrupar parcelas por mês (baseado na data de vencimento)
      parcelas?.forEach((parcela) => {
        const dataVencimento = new Date(parcela.data_vencimento)
        const ano = dataVencimento.getFullYear()
        const mes = dataVencimento.getMonth() + 1
        const key = `${ano}-${mes}`

        if (!gastosAgrupados[key]) {
          gastosAgrupados[key] = {
            ano,
            mes,
            mesNome: mesesNomes[mes - 1],
            total: 0,
            compras: [],
          }
        }

        // Adicionar parcela como compra (para manter compatibilidade com a interface)
        gastosAgrupados[key].compras.push({
          ...parcela,
          id: parcela.id,
          descricao: parcela.descricao,
          valor: parcela.valor,
          data: parcela.data_vencimento,
          cartao_id: parcela.cartao_id,
          categoria: parcela.categoria,
          metodo_pagamento: 'cartao',
          user_id: parcela.user_id,
        })
        gastosAgrupados[key].total += parcela.valor
      })

      // Converter para array e ordenar (mais recente primeiro)
      const gastosArray = Object.values(gastosAgrupados).sort((a, b) => {
        if (a.ano !== b.ano) return b.ano - a.ano
        return b.mes - a.mes
      })

      setGastosPorMes(gastosArray)

      // Abrir o mês atual por padrão
      const agora = new Date()
      const mesAtualKey = `${agora.getFullYear()}-${agora.getMonth() + 1}`
      setMesesAbertos(new Set([mesAtualKey]))
    } catch (error) {
      console.error('Erro ao carregar gastos:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleMes = (ano: number, mes: number) => {
    const key = `${ano}-${mes}`
    const novosAbertos = new Set(mesesAbertos)
    if (novosAbertos.has(key)) {
      novosAbertos.delete(key)
    } else {
      novosAbertos.add(key)
    }
    setMesesAbertos(novosAbertos)
  }

  const isMesAberto = (ano: number, mes: number) => {
    return mesesAbertos.has(`${ano}-${mes}`)
  }

  const getCartaoNome = (cartaoId: string | null) => {
    if (!cartaoId) return 'N/A'
    return cartoes.find((c) => c.id === cartaoId)?.nome || 'N/A'
  }

  const getTipoGasto = (categoriaNome: string) => {
    return tiposGastos.find((t) => t.nome === categoriaNome)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta compra?')) return

    try {
      const { error } = await supabase.from('compras').delete().eq('id', id)
      if (error) throw error
      loadDados()
    } catch (error) {
      console.error('Erro ao excluir compra:', error)
      alert('Erro ao excluir compra')
    }
  }

  const exportarPDF = (gastoMes: GastosPorMes) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    let yPos = margin

    // Cores
    const primaryColor: [number, number, number] = [30, 58, 95] // #1e3a5f
    const grayColor: [number, number, number] = [107, 114, 128] // #6b7280

    // Cabeçalho
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, pageWidth, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Infinity', margin, 20)
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Relatório de Despesas', margin, 30)

    yPos = 50

    // Título do mês
    doc.setTextColor(...primaryColor)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(`${gastoMes.mesNome} ${gastoMes.ano}`, margin, yPos)
    yPos += 10

    // Informações do mês
    doc.setTextColor(...grayColor)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total: R$ ${gastoMes.total.toFixed(2)}`, margin, yPos)
    yPos += 6
    doc.text(`Total de compras: ${gastoMes.compras.length}`, margin, yPos)
    yPos += 15

    // Tabela
    const tableTop = yPos
    const colWidths = [60, 30, 25, 30, 35]
    const colHeaders = ['Descrição', 'Valor', 'Data', 'Método', 'Categoria']
    const colX = [margin, margin + 60, margin + 90, margin + 115, margin + 145]

    // Cabeçalho da tabela
    doc.setFillColor(...primaryColor)
    doc.rect(margin, tableTop - 8, pageWidth - (margin * 2), 8, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    colHeaders.forEach((header, i) => {
      doc.text(header, colX[i], tableTop - 2)
    })

    yPos = tableTop + 5

    // Linhas da tabela
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    gastoMes.compras.forEach((compra, index) => {
      // Verificar se precisa de nova página
      if (yPos > pageHeight - 30) {
        doc.addPage()
        yPos = margin
      }

      // Cor de fundo alternada
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245)
        doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 6, 'F')
      }

      // Dados da compra
      const descricao = compra.descricao.length > 25 
        ? compra.descricao.substring(0, 22) + '...' 
        : compra.descricao
      const valor = `R$ ${compra.valor.toFixed(2)}`
      const data = new Date(compra.data).toLocaleDateString('pt-BR')
      const metodo = compra.metodo_pagamento === 'pix' 
        ? 'PIX' 
        : compra.metodo_pagamento === 'dinheiro' 
        ? 'Dinheiro' 
        : getCartaoNome(compra.cartao_id || '')
      const categoria = compra.categoria.length > 12 
        ? compra.categoria.substring(0, 9) + '...' 
        : compra.categoria

      doc.text(descricao, colX[0], yPos)
      doc.text(valor, colX[1], yPos)
      doc.text(data, colX[2], yPos)
      doc.text(metodo, colX[3], yPos)
      doc.text(categoria, colX[4], yPos)

      yPos += 7
    })

    // Rodapé com total
    yPos += 5
    if (yPos > pageHeight - 20) {
      doc.addPage()
      yPos = margin
    }

    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 8

    doc.setTextColor(...primaryColor)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total do Mês: R$ ${gastoMes.total.toFixed(2)}`, pageWidth - margin - 50, yPos, { align: 'right' })

    // Data de geração
    yPos = pageHeight - 15
    doc.setTextColor(...grayColor)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    )

    // Salvar PDF
    const fileName = `Despesas_${gastoMes.mesNome}_${gastoMes.ano}.pdf`
    doc.save(fileName)
  }

  const totalGeral = gastosPorMes.reduce((sum, mes) => sum + mes.total, 0)

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
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Despesas</h1>
          <p className="text-gray-400">
            Todas as suas despesas organizadas por mês
          </p>
        </div>

        {/* Resumo Geral */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Geral</p>
              <p className="text-3xl font-bold text-white">
                R$ {totalGeral.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm mb-1">Períodos</p>
              <p className="text-2xl font-bold text-white">
                {gastosPorMes.length}
              </p>
            </div>
          </div>
        </div>

        {gastosPorMes.length === 0 ? (
          <div className="bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-700">
            <FiShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">
              Nenhuma despesa registrada
            </p>
            <p className="text-gray-500 text-sm">
              As compras aparecerão aqui quando forem cadastradas
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {gastosPorMes.map((gastoMes) => {
              const key = `${gastoMes.ano}-${gastoMes.mes}`
              const aberto = isMesAberto(gastoMes.ano, gastoMes.mes)

              return (
                <div
                  key={key}
                  className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden"
                >
                  {/* Cabeçalho do Mês */}
                  <div className="flex items-center justify-between p-6">
                    <button
                      onClick={() => toggleMes(gastoMes.ano, gastoMes.mes)}
                      className="flex-1 flex items-center justify-between hover:bg-gray-700/50 transition-colors text-left -m-6 p-6 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        {aberto ? (
                          <FiChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <FiChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <h2 className="text-xl font-semibold text-white">
                            {gastoMes.mesNome} {gastoMes.ano}
                          </h2>
                          <p className="text-sm text-gray-400">
                            {gastoMes.compras.length} compra{gastoMes.compras.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-400">
                          R$ {gastoMes.total.toFixed(2)}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        exportarPDF(gastoMes)
                      }}
                      className="ml-4 p-3 rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors flex items-center space-x-2"
                      title="Exportar PDF"
                    >
                      <FiDownload className="w-5 h-5" />
                      <span className="hidden sm:inline">Exportar PDF</span>
                    </button>
                  </div>

                  {/* Lista de Compras do Mês */}
                  {aberto && (
                    <div className="border-t border-gray-700">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-700/50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">
                                Descrição
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">
                                Valor
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">
                                Data
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">
                                Método
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">
                                Categoria
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {gastoMes.compras.map((compra) => {
                              const tipo = getTipoGasto(compra.categoria)
                              return (
                                <tr
                                  key={compra.id}
                                  className="hover:bg-gray-700/30 transition-colors"
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                                    {compra.descricao}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-white font-semibold">
                                    R$ {compra.valor.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                                    {new Date(compra.data).toLocaleDateString('pt-BR')}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {compra.metodo_pagamento === 'pix' ? (
                                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium border border-green-500/40">
                                        💳 PIX
                                      </span>
                                    ) : compra.metodo_pagamento === 'dinheiro' ? (
                                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium border border-yellow-500/40">
                                        💵 Dinheiro
                                      </span>
                                    ) : (
                                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium border border-blue-500/40">
                                        💳 {getCartaoNome(compra.cartao_id || '')}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {tipo ? (
                                      <span
                                        className="px-3 py-1 rounded-full text-xs font-medium"
                                        style={{
                                          backgroundColor: `${tipo.cor}20`,
                                          color: tipo.cor,
                                          border: `1px solid ${tipo.cor}40`,
                                        }}
                                      >
                                        {compra.categoria}
                                      </span>
                                    ) : (
                                      <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs">
                                        {compra.categoria}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => router.push(`/compras?edit=${compra.id}`)}
                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                        title="Editar"
                                      >
                                        <FiEdit className="w-5 h-5" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(compra.id)}
                                        className="text-red-400 hover:text-red-300 transition-colors"
                                        title="Excluir"
                                      >
                                        <FiTrash2 className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
