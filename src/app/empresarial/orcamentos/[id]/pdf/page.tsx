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

interface TemplateConfig {
  corPrimaria?: string
  corSecundaria?: string
  corTexto?: string
  corFundo?: string
  corBordas?: string
  corHeader?: string
  corTextoHeader?: string
  fonteTituloHeader?: number
  fonteTituloSecao?: number
  fonteFamilia?: string
  paddingPagina?: number
  paddingHeader?: number
  espacamentoSecoes?: number
  logoUrl?: string | null
  empresaNome?: string
  marcaDaguaUrl?: string | null
  marcaDaguaOpacidade?: number
  marcaDaguaRotacao?: number
  marcaDaguaPosicaoPersonalizada?: boolean
  marcaDaguaPosicaoX?: number
  marcaDaguaPosicaoY?: number
  marcaDaguaTamanho?: number
  marcaDaguaFormato?: string
}

interface PDFConfig {
  margin: number
  pageWidth: number
  pageHeight: number
  colors: {
    primary: [number, number, number]
    secondary: [number, number, number]
    text: [number, number, number]
    background: [number, number, number]
    border: [number, number, number]
    header: [number, number, number]
    textHeader: [number, number, number]
  }
  fonts: {
    titleHeader: number
    titleSection: number
    family: string
  }
  spacing: {
    pagePadding: number
    headerPadding: number
    sectionSpacing: number
  }
  watermark?: {
    url: string | null
    opacity: number
    rotation: number
    positionX: number | undefined
    positionY: number | undefined
    size: number
    format: string
  }
}

/**
 * Converte cor hexadecimal para RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [99, 102, 241] // Default roxo
}

/**
 * Classe para gerenciar a geração do PDF
 */
class PDFGenerator {
  private doc: jsPDF
  private config: PDFConfig
  private yPos: number
  private pageWidth: number
  private pageHeight: number
  private margin: number

  constructor(config: PDFConfig) {
    this.doc = new jsPDF()
    this.config = config
    this.pageWidth = config.pageWidth
    this.pageHeight = config.pageHeight
    this.margin = config.margin
    this.yPos = config.margin

    // Configurar fundo da primeira página
    this.drawBackground()
  }

  /**
   * Desenha o fundo da página
   */
  private drawBackground() {
    this.doc.setFillColor(...this.config.colors.background)
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, 'F')
  }

  /**
   * Desenha a marca d'água (assíncrono)
   */
  async drawWatermarkAsync() {
    if (!this.config.watermark?.url) return

    const watermark = this.config.watermark
    if (!watermark || !watermark.url) return

    return new Promise<void>((resolve) => {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = watermark.url!

        img.onload = () => {
          try {
            // Converter tamanho de px para mm (aproximado: 1px ≈ 0.264583mm)
            const sizeMm = (watermark.size || 120) * 0.264583

            // Calcular posição
            let x: number, y: number
            if (watermark.positionX !== undefined && watermark.positionY !== undefined) {
              // Posição personalizada (converter px para mm)
              x = watermark.positionX * 0.264583
              y = watermark.positionY * 0.264583
            } else {
              // Centralizado
              x = (this.pageWidth - sizeMm) / 2
              y = (this.pageHeight - sizeMm) / 2
            }

            // Aplicar rotação (em graus, jsPDF converte internamente)
            const rotation = watermark.rotation || 0

            // Desenhar imagem com rotação
            this.doc.addImage(
              img,
              'PNG',
              x,
              y,
              sizeMm,
              sizeMm,
              undefined,
              'FAST',
              rotation
            )
            resolve()
          } catch (error) {
            console.error('Erro ao desenhar marca d\'água:', error)
            resolve()
          }
        }

        img.onerror = () => {
          console.error('Erro ao carregar imagem da marca d\'água:', watermark.url)
          resolve()
        }
      } catch (error) {
        console.error('Erro ao processar marca d\'água:', error)
        resolve()
      }
    })
  }


  /**
   * Adiciona nova página se necessário
   */
  private async checkNewPage(requiredSpace: number = 20): Promise<boolean> {
    if (this.yPos + requiredSpace > this.pageHeight - 20) {
      this.doc.addPage()
      this.drawBackground()
      // Desenhar marca d'água na nova página
      await this.drawWatermarkAsync()
      this.yPos = this.margin
      return true
    }
    return false
  }

  /**
   * Desenha o header com logo e informações da empresa
   */
  async drawHeader(logoUrl: string | null, empresaNome: string, dataEmissao: string, dataValidade: string | null) {
    const headerHeight = logoUrl ? 40 : 30
    const logoSize = 30 // mm
    const logoPadding = 5 // mm

    // Fundo do header
    this.doc.setFillColor(...this.config.colors.header)
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F')

    // Borda inferior
    this.doc.setDrawColor(...this.config.colors.border)
    this.doc.setLineWidth(0.5)
    this.doc.line(0, headerHeight, this.pageWidth, headerHeight)

    // Logo à esquerda
    let logoWidth = 0
    if (logoUrl) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = logoUrl

        await new Promise<void>((resolve) => {
          img.onload = () => {
            try {
              const logoHeight = (img.height / img.width) * logoSize
              const logoY = (headerHeight - logoHeight) / 2
              this.doc.addImage(img, 'PNG', this.margin, logoY, logoSize, logoHeight)
              logoWidth = logoSize + logoPadding
              resolve()
            } catch (error) {
              console.error('Erro ao adicionar logo:', error)
              resolve()
            }
          }
          img.onerror = () => {
            console.error('Erro ao carregar logo:', logoUrl)
            resolve()
          }
        })
      } catch (error) {
        console.error('Erro ao processar logo:', error)
      }
    }

    // Nome da empresa e datas à direita (alinhados à direita)
    const rightMargin = this.margin
    const maxTextWidth = this.pageWidth - logoWidth - (rightMargin * 2)

    this.doc.setTextColor(...this.config.colors.textHeader)
    this.doc.setFontSize(this.config.fonts.titleHeader)
    this.doc.setFont('helvetica', 'bold')

    // Nome da empresa (alinhado à direita)
    const empresaLines = this.doc.splitTextToSize(empresaNome, maxTextWidth)
    const empresaY = logoUrl ? 12 : 10
    this.doc.text(empresaLines, this.pageWidth - rightMargin, empresaY, { align: 'right' })

    // Datas (alinhadas à direita)
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'normal')
    const datasText = dataValidade
      ? `EMISSÃO: ${dataEmissao} • VALIDADE: ${dataValidade}`
      : `EMISSÃO: ${dataEmissao}`
    this.doc.text(datasText, this.pageWidth - rightMargin, empresaY + (empresaLines.length * 5) + 5, { align: 'right' })

    this.yPos = headerHeight + this.config.spacing.sectionSpacing / 2
  }

  /**
   * Desenha seções de PRESTADOR e CLIENTE lado a lado
   */
  async drawPrestadorClienteSection(orcamento: Orcamento, perfilData: any) {
    await this.checkNewPage(50)

    const sectionTop = this.yPos
    const sectionWidth = (this.pageWidth - (this.margin * 2) - this.config.spacing.sectionSpacing) / 2
    const padding = 3
    const sectionHeight = 50

    // Caixa geral
    this.doc.setFillColor(...this.config.colors.background)
    this.doc.setDrawColor(...this.config.colors.border)
    this.doc.setLineWidth(0.5)
    this.doc.rect(this.margin, sectionTop, this.pageWidth - (this.margin * 2), sectionHeight, 'FD')

    // Linha divisória vertical
    const dividerX = this.margin + sectionWidth + (this.config.spacing.sectionSpacing / 2)
    this.doc.setDrawColor(...this.config.colors.border)
    this.doc.setLineWidth(0.3)
    this.doc.line(dividerX, sectionTop, dividerX, sectionTop + sectionHeight)

    // Seção PRESTADOR (esquerda)
    this.doc.setTextColor(...this.config.colors.secondary)
    this.doc.setFontSize(this.config.fonts.titleSection)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('PRESTADOR', this.margin + padding, sectionTop + 7)

    this.doc.setTextColor(...this.config.colors.text)
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')

    let prestadorY = sectionTop + 12
    if (perfilData?.empresa_nome) {
      this.doc.text(`EMPRESA: ${perfilData.empresa_nome}`, this.margin + padding, prestadorY)
      prestadorY += 5
    }
    if (perfilData?.empresa_cnpj) {
      this.doc.text(`CNPJ: ${perfilData.empresa_cnpj}`, this.margin + padding, prestadorY)
      prestadorY += 5
    }
    if (perfilData?.email) {
      this.doc.text(`EMAIL: ${perfilData.email}`, this.margin + padding, prestadorY)
      prestadorY += 5
    }
    if (perfilData?.telefone) {
      this.doc.text(`TELEFONE: ${perfilData.telefone}`, this.margin + padding, prestadorY)
      prestadorY += 5
    }
    if (perfilData?.celular) {
      this.doc.text(`CELULAR: ${perfilData.celular}`, this.margin + padding, prestadorY)
      prestadorY += 5
    }
    if (perfilData?.endereco) {
      const enderecoLines = this.doc.splitTextToSize(
        `ENDEREÇO: ${perfilData.endereco}`,
        sectionWidth - (padding * 2)
      )
      this.doc.text(enderecoLines, this.margin + padding, prestadorY)
      prestadorY += enderecoLines.length * 5
    }

    // Seção CLIENTE (direita)
    const clienteX = dividerX + (this.config.spacing.sectionSpacing / 2)
    this.doc.setTextColor(...this.config.colors.secondary)
    this.doc.setFontSize(this.config.fonts.titleSection)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('CLIENTE', clienteX, sectionTop + 7)

    this.doc.setTextColor(...this.config.colors.text)
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')

    let clienteY = sectionTop + 12
    if (orcamento.cliente_nome) {
      this.doc.text(`NOME: ${orcamento.cliente_nome}`, clienteX, clienteY)
      clienteY += 5
    }
    if (orcamento.cliente_email) {
      this.doc.text(`EMAIL: ${orcamento.cliente_email}`, clienteX, clienteY)
      clienteY += 5
    }
    if (orcamento.cliente_telefone) {
      this.doc.text(`TELEFONE: ${orcamento.cliente_telefone}`, clienteX, clienteY)
      clienteY += 5
    }
    if (orcamento.cliente_endereco) {
      const enderecoLines = this.doc.splitTextToSize(
        `ENDEREÇO: ${orcamento.cliente_endereco}`,
        sectionWidth - (padding * 2)
      )
      this.doc.text(enderecoLines, clienteX, clienteY)
      clienteY += enderecoLines.length * 5
    }

    this.yPos = sectionTop + sectionHeight + this.config.spacing.sectionSpacing / 2
  }

  /**
   * Desenha a tabela de itens (QTD., DESCRIÇÃO, VALOR, SUBTOTAL)
   */
  async drawItemsTable(itens: ItemOrcamento[]) {
    await this.checkNewPage(30)

    // Título da seção
    this.doc.setTextColor(...this.config.colors.secondary)
    this.doc.setFontSize(this.config.fonts.titleSection)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('PRODUTOS/SERVIÇOS', this.margin, this.yPos)
    this.yPos += 8

    // Definir colunas da tabela com larguras proporcionais fixas
    const colHeaders = ['QTD.', 'DESCRIÇÃO', 'VALOR', 'SUBTOTAL']
    const tableWidth = this.pageWidth - (this.margin * 2)
    
    // Larguras proporcionais: QTD (10%), DESCRIÇÃO (50%), VALOR (20%), SUBTOTAL (20%)
    const colWidths = [
      tableWidth * 0.10,  // QTD
      tableWidth * 0.50,  // DESCRIÇÃO
      tableWidth * 0.20,  // VALOR
      tableWidth * 0.20,  // SUBTOTAL
    ]

    // Calcular posições X das colunas (centralizadas nas suas larguras)
    const colX: number[] = []
    let currentX = this.margin
    colWidths.forEach((width, index) => {
      colX.push(currentX)
      currentX += width
    })

    const headerHeight = 8
    const tableTop = this.yPos

    // Cabeçalho da tabela - usar cor primária com 20% de opacidade (fundo claro)
    // Simular 20% de opacidade: cor * 0.2 + branco * 0.8
    const [r, g, b] = this.config.colors.primary
    const lightR = Math.round(r * 0.2 + 255 * 0.8)
    const lightG = Math.round(g * 0.2 + 255 * 0.8)
    const lightB = Math.round(b * 0.2 + 255 * 0.8)
    
    this.doc.setFillColor(lightR, lightG, lightB)
    this.doc.rect(this.margin, tableTop, tableWidth, headerHeight, 'F')

    // Texto do header na cor do texto (não branco, pois o fundo agora é claro)
    this.doc.setTextColor(...this.config.colors.text)
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')

    // Desenhar cabeçalhos com alinhamento correto
    colHeaders.forEach((header, i) => {
      const align = i >= 2 ? 'right' : 'left' // VALOR e SUBTOTAL alinhados à direita
      const padding = 4 // mm
      let xPos: number
      
      if (i === 0) {
        // QTD - alinhado à esquerda com padding
        xPos = colX[i] + padding
      } else if (i === 1) {
        // DESCRIÇÃO - alinhado à esquerda com padding
        xPos = colX[i] + padding
      } else {
        // VALOR e SUBTOTAL - alinhados à direita com padding
        xPos = colX[i] + colWidths[i] - padding
      }
      
      this.doc.text(header, xPos, tableTop + 6, { align })
    })
    
    // IMPORTANTE: Resetar cor do texto para a cor do template antes de desenhar as linhas
    this.doc.setTextColor(...this.config.colors.text)

    // Borda externa do cabeçalho (sem sobreposição)
    this.doc.setDrawColor(...this.config.colors.border)
    this.doc.setLineWidth(0.5)
    // Desenhar apenas as bordas necessárias (sem duplicar)
    this.doc.line(this.margin, tableTop, this.pageWidth - this.margin, tableTop) // Topo
    this.doc.line(this.margin, tableTop + headerHeight, this.pageWidth - this.margin, tableTop + headerHeight) // Base do header
    this.doc.line(this.margin, tableTop, this.margin, tableTop + headerHeight) // Esquerda
    this.doc.line(this.pageWidth - this.margin, tableTop, this.pageWidth - this.margin, tableTop + headerHeight) // Direita
    
    // Bordas verticais entre colunas no header
    this.doc.setLineWidth(0.3)
    for (let i = 1; i < colX.length; i++) {
      this.doc.line(colX[i], tableTop, colX[i], tableTop + headerHeight)
    }

    // Espaçamento após o header
    this.yPos = tableTop + headerHeight + 1

    // Linhas da tabela
    this.doc.setTextColor(...this.config.colors.text)
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'normal')

    // Armazenar informações de cada linha
    interface RowInfo {
      top: number
      bottom: number
      height: number
    }
    const rows: RowInfo[] = []

    for (let index = 0; index < itens.length; index++) {
      const item = itens[index]
      await this.checkNewPage(15)

      const padding = 4 // mm - padding horizontal
      const verticalPadding = 4 // mm - padding vertical dentro da célula
      const rowStartY = this.yPos

      // Calcular altura da linha baseada na descrição
      const descricaoMaxWidth = colWidths[1] - (padding * 2)
      const descricao = this.doc.splitTextToSize(item.descricao, descricaoMaxWidth)
      const lineHeight = 4.5 // mm - altura de cada linha de texto
      const numLines = descricao.length
      const textHeight = numLines * lineHeight
      const rowHeight = Math.max(10, textHeight + (verticalPadding * 2)) // Altura mínima de 10mm

      // Desenhar fundo alternado ANTES do texto
      if (index % 2 === 0) {
        this.doc.setFillColor(250, 250, 250)
        this.doc.rect(this.margin, rowStartY, tableWidth, rowHeight, 'F')
      }

      // Posição Y inicial do texto (com padding vertical adequado)
      const textStartY = rowStartY + verticalPadding + lineHeight

      // Garantir que a cor do texto está correta (não branca)
      this.doc.setTextColor(...this.config.colors.text)
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'normal')

      // Desenhar texto
      // QTD. - alinhado à esquerda (sempre na primeira linha)
      this.doc.text(item.quantidade.toString(), colX[0] + padding, textStartY)
      
      // DESCRIÇÃO - alinhado à esquerda (pode ter múltiplas linhas)
      if (descricao.length === 1) {
        // Uma linha apenas
        this.doc.text(descricao[0], colX[1] + padding, textStartY)
      } else {
        // Múltiplas linhas - desenhar cada uma
        descricao.forEach((line: string, lineIndex: number) => {
          this.doc.text(line, colX[1] + padding, textStartY + (lineIndex * lineHeight))
        })
      }
      
      // VALOR - alinhado à direita (sempre na primeira linha)
      this.doc.text(
        `R$ ${item.valor_unitario.toFixed(2)}`,
        colX[2] + colWidths[2] - padding,
        textStartY,
        { align: 'right' }
      )
      
      // SUBTOTAL - alinhado à direita (sempre na primeira linha)
      this.doc.text(
        `R$ ${item.valor_total.toFixed(2)}`,
        colX[3] + colWidths[3] - padding,
        textStartY,
        { align: 'right' }
      )

      const rowEndY = rowStartY + rowHeight
      rows.push({
        top: rowStartY,
        bottom: rowEndY,
        height: rowHeight,
      })

      // Espaçamento após a linha (antes da próxima linha ou borda)
      this.yPos = rowEndY
    }

    // Desenhar todas as bordas DEPOIS do conteúdo (sem sobreposição)
    this.doc.setDrawColor(...this.config.colors.border)
    const tableBodyEnd = this.yPos
    
    // Bordas verticais entre colunas (contínuas do header até o final)
    this.doc.setLineWidth(0.3)
    for (let i = 1; i < colX.length; i++) {
      this.doc.line(colX[i], tableTop + headerHeight, colX[i], tableBodyEnd)
    }
    
    // Bordas horizontais entre linhas (na parte inferior de cada linha)
    this.doc.setLineWidth(0.3)
    rows.forEach((row, index) => {
      // Desenhar linha divisória na parte inferior de cada linha (exceto a última)
      if (index < rows.length - 1) {
        this.doc.line(this.margin, row.bottom, this.pageWidth - this.margin, row.bottom)
      }
    })
    
    // Bordas laterais e inferior da tabela (mais grossas)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, tableTop + headerHeight, this.margin, tableBodyEnd) // Esquerda
    this.doc.line(this.pageWidth - this.margin, tableTop + headerHeight, this.pageWidth - this.margin, tableBodyEnd) // Direita
    this.doc.line(this.margin, tableBodyEnd, this.pageWidth - this.margin, tableBodyEnd) // Inferior

    this.yPos = tableBodyEnd + 1
  }

  /**
   * Desenha seção de totais
   */
  async drawTotalsSection(orcamento: Orcamento) {
    this.yPos += 5
    await this.checkNewPage(30)

    // Linha separadora
    this.doc.setDrawColor(...this.config.colors.border)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, this.yPos, this.pageWidth - this.margin, this.yPos)
    this.yPos += 8

    const rightMargin = this.margin
    const labelWidth = 50

    // Subtotal
    this.doc.setTextColor(...this.config.colors.text)
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Subtotal:', this.pageWidth - rightMargin - labelWidth, this.yPos, { align: 'right' })
    this.doc.text(`R$ ${orcamento.valor_total.toFixed(2)}`, this.pageWidth - rightMargin, this.yPos, { align: 'right' })
    this.yPos += 7

    // Desconto
    if (orcamento.desconto > 0) {
      this.doc.text('Desconto:', this.pageWidth - rightMargin - labelWidth, this.yPos, { align: 'right' })
      this.doc.setTextColor(255, 0, 0)
      this.doc.text(`- R$ ${orcamento.desconto.toFixed(2)}`, this.pageWidth - rightMargin, this.yPos, { align: 'right' })
      this.doc.setTextColor(...this.config.colors.text)
      this.yPos += 7
    }

    // Linha antes do total
    this.doc.setDrawColor(...this.config.colors.border)
    this.doc.setLineWidth(1)
    this.doc.line(this.margin, this.yPos, this.pageWidth - this.margin, this.yPos)
    this.yPos += 8

    // Total
    this.doc.setTextColor(...this.config.colors.primary)
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('TOTAL:', this.pageWidth - rightMargin - labelWidth, this.yPos, { align: 'right' })
    this.doc.text(`R$ ${orcamento.valor_final.toFixed(2)}`, this.pageWidth - rightMargin, this.yPos, { align: 'right' })
    this.yPos += 15
  }

  /**
   * Desenha informações adicionais
   */
  async drawAdditionalInfo(orcamento: Orcamento) {
    if (!orcamento.condicoes_pagamento && !orcamento.prazo_entrega && !orcamento.observacoes) {
      return
    }

    await this.checkNewPage(40)

    this.doc.setTextColor(...this.config.colors.secondary)
    this.doc.setFontSize(this.config.fonts.titleSection)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('INFORMAÇÕES ADICIONAIS:', this.margin, this.yPos)
    this.yPos += 8

    this.doc.setTextColor(...this.config.colors.text)
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')

    if (orcamento.condicoes_pagamento) {
      this.doc.text(`Condições de Pagamento: ${orcamento.condicoes_pagamento}`, this.margin, this.yPos)
      this.yPos += 6
    }

    if (orcamento.prazo_entrega) {
      this.doc.text(`Prazo de Entrega: ${orcamento.prazo_entrega}`, this.margin, this.yPos)
      this.yPos += 6
    }

    if (orcamento.observacoes) {
      const observacoesLines = this.doc.splitTextToSize(orcamento.observacoes, this.pageWidth - (this.margin * 2))
      this.doc.text(observacoesLines, this.margin, this.yPos)
      this.yPos += observacoesLines.length * 6
    }
  }

  /**
   * Desenha o rodapé
   */
  drawFooter(rodapePersonalizado: string | null) {
    const grayColor: [number, number, number] = [107, 114, 128]
    const footerY = this.pageHeight - 20

    // Linha do rodapé
    this.doc.setDrawColor(...grayColor)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, footerY, this.pageWidth - this.margin, footerY)

    let currentY = footerY + 8

    // Rodapé personalizado
    if (rodapePersonalizado) {
      this.doc.setTextColor(...grayColor)
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      const rodapeLines = this.doc.splitTextToSize(rodapePersonalizado, this.pageWidth - (this.margin * 2))
      this.doc.text(rodapeLines, this.pageWidth / 2, currentY, { align: 'center' })
      currentY += rodapeLines.length * 4
    }

    // Data de geração
    this.doc.setTextColor(...grayColor)
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'normal')
    const dataGeracao = `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    this.doc.text(dataGeracao, this.pageWidth / 2, currentY, { align: 'center' })
  }

  /**
   * Salva o PDF
   */
  save(fileName: string) {
    this.doc.save(fileName)
  }
}

/**
 * Carrega configurações do template
 */
async function loadTemplateConfig(userId: string): Promise<TemplateConfig | null> {
  if (typeof window === 'undefined') return null

  try {
    const estiloSalvo = localStorage.getItem(`orcamento_template_${userId}`)
    if (estiloSalvo) {
      return JSON.parse(estiloSalvo)
    }
  } catch (e) {
    console.error('Erro ao carregar template:', e)
  }
  return null
}

/**
 * Carrega dados do perfil
 */
async function loadProfileData(userId: string, templateConfig: TemplateConfig | null) {
  const { data: perfil } = await supabase
    .from('perfis')
    .select('empresa_nome, empresa_cnpj, telefone, celular, endereco, logo_empresa_url')
    .eq('user_id', userId)
    .single()

  const empresaNome = perfil?.empresa_nome || templateConfig?.empresaNome || 'Nome da Empresa'
  const logoUrl = templateConfig?.logoUrl || perfil?.logo_empresa_url || null
  
  // A marca d'água sempre será a logo do perfil (se existir)
  const marcaDaguaUrl = perfil?.logo_empresa_url || null

  return {
    empresaNome,
    logoUrl,
    marcaDaguaUrl,
      perfilData: {
      empresa_nome: perfil?.empresa_nome,
      empresa_cnpj: perfil?.empresa_cnpj,
      telefone: perfil?.telefone,
      celular: perfil?.celular,
      endereco: perfil?.endereco,
      email: null as string | null, // Será preenchido com o email da sessão
    },
  }
}

/**
 * Cria configuração do PDF a partir do template
 */
function createPDFConfig(templateConfig: TemplateConfig | null, orcamento: Orcamento): PDFConfig {
  const pageWidth = 210 // A4 width in mm
  const pageHeight = 297 // A4 height in mm

  // Valores fixos para layout consistente
  const margin = 10 // mm - margem fixa

  // Garantir que a cor do texto seja preta se não estiver definida
  const corTexto = templateConfig?.corTexto || '#000000'
  
  return {
    margin,
    pageWidth,
    pageHeight,
    colors: {
      primary: hexToRgb(templateConfig?.corPrimaria || orcamento.cor_primaria || '#111827'),
      secondary: hexToRgb(templateConfig?.corSecundaria || orcamento.cor_secundaria || '#111827'),
      text: hexToRgb(corTexto),
      background: hexToRgb(templateConfig?.corFundo || '#FFFFFF'),
      border: hexToRgb(templateConfig?.corBordas || '#111827'),
      header: hexToRgb(templateConfig?.corHeader || '#FFFFFF'),
      textHeader: hexToRgb(templateConfig?.corTextoHeader || '#111827'),
    },
    fonts: {
      titleHeader: templateConfig?.fonteTituloHeader || 18,
      titleSection: templateConfig?.fonteTituloSecao || 12,
      family: templateConfig?.fonteFamilia || 'Arial',
    },
    spacing: {
      pagePadding: 20, // px fixo
      headerPadding: 16, // px fixo
      sectionSpacing: 16, // px fixo
    },
    watermark: {
      url: null, // Será preenchido com a logo do perfil
      opacity: 30, // 30% de opacidade fixa
      rotation: -45, // -45 graus fixo (diagonal)
      positionX: undefined, // Centralizada
      positionY: undefined, // Centralizada
      size: 200, // 200px fixo
      format: 'quadrado', // Formato fixo
    },
  }
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
      if (!userId) throw new Error('Usuário não autenticado')

      // Carregar dados
      const templateConfig = await loadTemplateConfig(userId)
      const { empresaNome, logoUrl, marcaDaguaUrl, perfilData } = await loadProfileData(userId, templateConfig)
      
      // Adicionar email da sessão ao perfil
      if (session?.user?.email) {
        perfilData.email = session.user.email
      }

      const { data: orcamento, error: orcamentoError } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('id', orcamentoId)
        .eq('user_id', userId)
        .single()

      if (orcamentoError) throw orcamentoError

      const { data: itens, error: itensError } = await supabase
        .from('orcamento_itens')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .eq('user_id', userId)
        .order('item_numero', { ascending: true })

      if (itensError) throw itensError

      // Criar gerador de PDF
      const pdfConfig = createPDFConfig(templateConfig, orcamento)
      
      // Sempre usar a logo do perfil como marca d'água (se existir)
      if (marcaDaguaUrl && pdfConfig.watermark) {
        pdfConfig.watermark.url = marcaDaguaUrl
      }
      
      const pdf = new PDFGenerator(pdfConfig)

      // Formatar datas
      const dataEmissao = new Date(orcamento.data_emissao).toLocaleDateString('pt-BR')
      const dataValidade = orcamento.data_validade
        ? new Date(orcamento.data_validade).toLocaleDateString('pt-BR')
        : null

      // Gerar PDF
      await pdf.drawHeader(logoUrl, empresaNome, dataEmissao, dataValidade)
      
      // Desenhar marca d'água na primeira página
      await pdf.drawWatermarkAsync()
      
      await pdf.drawPrestadorClienteSection(orcamento, perfilData)
      await pdf.drawItemsTable(itens || [])
      await pdf.drawTotalsSection(orcamento)
      await pdf.drawAdditionalInfo(orcamento)
      pdf.drawFooter(orcamento.rodape_personalizado)

      // Salvar PDF
      const fileName = `Orcamento_${orcamento.numero.replace(/\s/g, '_')}.pdf`
      pdf.save(fileName)

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
