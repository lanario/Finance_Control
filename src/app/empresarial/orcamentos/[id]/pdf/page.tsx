'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import jsPDF from 'jspdf'

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
  item_numero: number
  descricao: string
  quantidade: number
  unidade: string
  valor_unitario: number
  desconto: number
  valor_total: number
  observacoes: string | null
}

// Função para converter hex para RGB
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [99, 102, 241] // Default roxo
}

export default function GerarPDFOrcamentoPage() {
  const { session } = useAuth()
  const router = useRouter()
  const params = useParams()
  const orcamentoId = params.id as string

  useEffect(() => {
    if (session && orcamentoId) {
      gerarPDF()
    }
  }, [session, orcamentoId])

  const gerarPDF = async () => {
    try {
      const userId = session?.user?.id

      // Carregar orçamento
      const { data: orcamento, error: orcamentoError } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('id', orcamentoId)
        .eq('user_id', userId)
        .single()

      if (orcamentoError) throw orcamentoError

      // Carregar itens
      const { data: itens, error: itensError } = await supabase
        .from('orcamento_itens')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .eq('user_id', userId)
        .order('item_numero', { ascending: true })

      if (itensError) throw itensError

      // Gerar PDF
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPos = margin

      // Cores
      const primaryColor = hexToRgb(orcamento.cor_primaria || '#6366f1')
      const secondaryColor = hexToRgb(orcamento.cor_secundaria || '#8b5cf6')
      const grayColor: [number, number, number] = [107, 114, 128]

      // Cabeçalho
      doc.setFillColor(...primaryColor)
      doc.rect(0, 0, pageWidth, 50, 'F')

      // Logo (se existir)
      if (orcamento.logo_url) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = orcamento.logo_url
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              try {
                const logoWidth = 40
                const logoHeight = (img.height / img.width) * logoWidth
                doc.addImage(img, 'PNG', margin, 5, logoWidth, logoHeight)
                resolve(null)
              } catch (error) {
                reject(error)
              }
            }
            img.onerror = reject
          })
        } catch (error) {
          console.error('Erro ao carregar logo:', error)
        }
      }

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('ORÇAMENTO', margin + (orcamento.logo_url ? 50 : 0), 20)

      if (orcamento.cabecalho_personalizado) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const lines = doc.splitTextToSize(orcamento.cabecalho_personalizado, pageWidth - (margin * 2) - (orcamento.logo_url ? 50 : 0))
        doc.text(lines, margin + (orcamento.logo_url ? 50 : 0), 30)
      }

      yPos = 60

      // Informações do Orçamento
      doc.setTextColor(...primaryColor)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(`Orçamento: ${orcamento.numero}`, margin, yPos)
      yPos += 8

      doc.setTextColor(...grayColor)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Data de Emissão: ${new Date(orcamento.data_emissao).toLocaleDateString('pt-BR')}`, margin, yPos)
      yPos += 6

      if (orcamento.data_validade) {
        doc.text(`Validade: ${new Date(orcamento.data_validade).toLocaleDateString('pt-BR')}`, margin, yPos)
        yPos += 6
      }

      // Dados do Cliente
      if (orcamento.cliente_nome) {
        yPos += 5
        doc.setTextColor(...primaryColor)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Cliente:', margin, yPos)
        yPos += 7

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.text(orcamento.cliente_nome, margin, yPos)
        yPos += 6

        if (orcamento.cliente_email) {
          doc.text(`Email: ${orcamento.cliente_email}`, margin, yPos)
          yPos += 6
        }

        if (orcamento.cliente_telefone) {
          doc.text(`Telefone: ${orcamento.cliente_telefone}`, margin, yPos)
          yPos += 6
        }

        if (orcamento.cliente_endereco) {
          const enderecoLines = doc.splitTextToSize(orcamento.cliente_endereco, pageWidth - (margin * 2))
          doc.text(enderecoLines, margin, yPos)
          yPos += enderecoLines.length * 6
        }
      }

      yPos += 10

      // Tabela de Itens
      const tableTop = yPos
      const colWidths = [15, 80, 20, 15, 25, 20, 25]
      const colHeaders = ['#', 'Descrição', 'Qtd', 'Un', 'Vl. Unit.', 'Desc.', 'Total']
      const colX = [
        margin,
        margin + 15,
        margin + 95,
        margin + 115,
        margin + 130,
        margin + 155,
        margin + 175,
      ]

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

      itens.forEach((item, index) => {
        // Verificar se precisa de nova página
        if (yPos > pageHeight - 50) {
          doc.addPage()
          yPos = margin
        }

        // Cor de fundo alternada
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245)
          doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 6, 'F')
        }

        const descricao = item.descricao.length > 35
          ? item.descricao.substring(0, 32) + '...'
          : item.descricao

        doc.text(item.item_numero.toString(), colX[0], yPos)
        doc.text(descricao, colX[1], yPos)
        doc.text(item.quantidade.toString(), colX[2], yPos)
        doc.text(item.unidade, colX[3], yPos)
        doc.text(`R$ ${item.valor_unitario.toFixed(2)}`, colX[4], yPos)
        doc.text(`R$ ${item.desconto.toFixed(2)}`, colX[5], yPos)
        doc.text(`R$ ${item.valor_total.toFixed(2)}`, colX[6], yPos)

        yPos += 7
      })

      // Totais
      yPos += 5
      if (yPos > pageHeight - 40) {
        doc.addPage()
        yPos = margin
      }

      doc.setDrawColor(...primaryColor)
      doc.setLineWidth(0.5)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 8

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Subtotal:', pageWidth - margin - 60, yPos, { align: 'right' })
      doc.text(`R$ ${orcamento.valor_total.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
      yPos += 7

      if (orcamento.desconto > 0) {
        doc.text('Desconto:', pageWidth - margin - 60, yPos, { align: 'right' })
        doc.setTextColor(255, 0, 0)
        doc.text(`- R$ ${orcamento.desconto.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
        doc.setTextColor(0, 0, 0)
        yPos += 7
      }

      doc.setDrawColor(...primaryColor)
      doc.setLineWidth(1)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 8

      doc.setTextColor(...primaryColor)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL:', pageWidth - margin - 60, yPos, { align: 'right' })
      doc.text(`R$ ${orcamento.valor_final.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })

      // Informações Adicionais
      yPos += 15
      if (yPos > pageHeight - 60) {
        doc.addPage()
        yPos = margin
      }

      if (orcamento.condicoes_pagamento || orcamento.prazo_entrega || orcamento.observacoes) {
        doc.setTextColor(...primaryColor)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Informações Adicionais:', margin, yPos)
        yPos += 8

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        if (orcamento.condicoes_pagamento) {
          doc.text(`Condições de Pagamento: ${orcamento.condicoes_pagamento}`, margin, yPos)
          yPos += 6
        }

        if (orcamento.prazo_entrega) {
          doc.text(`Prazo de Entrega: ${orcamento.prazo_entrega}`, margin, yPos)
          yPos += 6
        }

        if (orcamento.observacoes) {
          const observacoesLines = doc.splitTextToSize(orcamento.observacoes, pageWidth - (margin * 2))
          doc.text(observacoesLines, margin, yPos)
          yPos += observacoesLines.length * 6
        }
      }

      // Rodapé
      yPos = pageHeight - 20
      doc.setDrawColor(...grayColor)
      doc.setLineWidth(0.5)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 8

      if (orcamento.rodape_personalizado) {
        doc.setTextColor(...grayColor)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        const rodapeLines = doc.splitTextToSize(orcamento.rodape_personalizado, pageWidth - (margin * 2))
        doc.text(rodapeLines, pageWidth / 2, yPos, { align: 'center' })
        yPos += rodapeLines.length * 4
      }

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
      const fileName = `Orcamento_${orcamento.numero.replace(/\s/g, '_')}.pdf`
      doc.save(fileName)

      // Redirecionar após download
      setTimeout(() => {
        router.push('/empresarial/orcamentos')
      }, 500)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF do orçamento')
      router.push('/empresarial/orcamentos')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-white text-lg">Gerando PDF...</p>
      </div>
    </div>
  )
}
