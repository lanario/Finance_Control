/**
 * Utilitário para extrair dados de faturas de cartão de crédito a partir de PDFs
 * 
 * IMPORTANTE: Este módulo só funciona no cliente (browser)
 */

// Importação dinâmica do pdfjs-dist apenas no cliente
let pdfjsLib: any = null
let workerConfigured = false
let loadingPromise: Promise<any> | null = null

// Garantir que este módulo não seja executado no servidor
if (typeof window === 'undefined') {
  // No servidor, exportar funções vazias ou que lançam erro
  console.warn('pdf-extractor: Módulo carregado no servidor. PDF.js só funciona no cliente.')
}

async function getPdfjsLib() {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js só pode ser usado no cliente')
  }

  // Se já está carregando, aguardar o carregamento existente
  if (loadingPromise) {
    await loadingPromise
    return pdfjsLib
  }

  // Se já está carregado, retornar
  if (pdfjsLib) {
    return pdfjsLib
  }

  // Iniciar carregamento
  loadingPromise = (async () => {
    try {
      console.log('Tentando importar pdfjs-dist...')
      
      // Importar o módulo padrão - versão 3.x é mais estável
      // Usar import dinâmico com string literal para webpack conseguir analisar
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfjsModule = await import('pdfjs-dist')
      console.log('pdfjs-dist importado com sucesso')
      console.log('Chaves do módulo:', Object.keys(pdfjsModule))
      
      // Na versão 3.x, o módulo é exportado de forma mais simples
      pdfjsLib = pdfjsModule.default || pdfjsModule
      
      // Verificar se getDocument está disponível
      if (!pdfjsLib) {
        throw new Error('Módulo pdfjs não foi carregado corretamente')
      }
      
      console.log('Verificando getDocument...', typeof pdfjsLib.getDocument)
      
      if (!pdfjsLib.getDocument) {
        console.error('getDocument não encontrado. Chaves disponíveis:', Object.keys(pdfjsLib))
        throw new Error('getDocument não encontrado. Estrutura do módulo: ' + JSON.stringify(Object.keys(pdfjsModule)))
      }
      
      // Configurar worker do PDF.js usando arquivo local (mais confiável)
      if (!workerConfigured && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
        // Usar worker local da pasta public
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
        console.log('Worker configurado para usar arquivo local:', '/pdf.worker.min.js')
        workerConfigured = true
      }
      
      loadingPromise = null
      console.log('pdfjs-dist configurado com sucesso!')
      return pdfjsLib
    } catch (error: any) {
      loadingPromise = null
      console.error('Erro ao importar pdfjs-dist:', error)
      console.error('Detalhes do erro:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        cause: error?.cause
      })
      throw new Error(`Erro ao carregar biblioteca de PDF: ${error?.message || 'Erro desconhecido'}`)
    }
  })()

  return loadingPromise
}

export interface TransacaoExtraida {
  descricao: string
  valor: number
  data: string
  categoria?: string
}

/**
 * Extrai texto de um arquivo PDF
 */
export async function extrairTextoDoPDF(file: File): Promise<string> {
  try {
    console.log('[PDF] Iniciando extração do PDF...')
    console.log('[PDF] Arquivo:', file.name, 'Tipo:', file.type, 'Tamanho:', file.size)
    
    // Verificar se é um arquivo PDF válido
    if (!file || file.type !== 'application/pdf') {
      throw new Error('O arquivo selecionado não é um PDF válido')
    }

    console.log('[PDF] Carregando biblioteca PDF.js...')
    // Importar pdfjs-dist dinamicamente apenas no cliente
    let pdfjs: any
    try {
      pdfjs = await getPdfjsLib()
      console.log('[PDF] Biblioteca PDF.js carregada com sucesso')
    } catch (libError: any) {
      console.error('[PDF] Erro ao carregar biblioteca:', libError)
      throw new Error(`Erro ao carregar biblioteca de PDF: ${libError?.message || 'Erro desconhecido'}. Por favor, recarregue a página e tente novamente.`)
    }
    
    // Garantir que getDocument está disponível
    if (!pdfjs) {
      throw new Error('Biblioteca PDF.js não foi carregada')
    }
    
    if (!pdfjs.getDocument) {
      console.error('[PDF] pdfjs disponível mas getDocument não encontrado:', Object.keys(pdfjs))
      throw new Error('Função getDocument não encontrada na biblioteca PDF.js')
    }
    
    console.log('[PDF] Lendo arquivo como ArrayBuffer...')
    const arrayBuffer = await file.arrayBuffer()
    
    // Verificar se o arrayBuffer tem conteúdo
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('O arquivo PDF está vazio ou corrompido')
    }
    
    console.log('[PDF] ArrayBuffer criado, tamanho:', arrayBuffer.byteLength)
    console.log('[PDF] Carregando documento PDF...')
    
    let pdf: any
    try {
      pdf = await pdfjs.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        verbosity: 0 // Reduzir logs
      }).promise
    } catch (docError: any) {
      console.error('[PDF] Erro ao carregar documento:', docError)
      throw new Error(`Erro ao processar o PDF: ${docError?.message || 'Não foi possível ler o arquivo PDF'}`)
    }
    
    if (!pdf || !pdf.numPages) {
      throw new Error('Não foi possível ler o PDF ou o arquivo está corrompido')
    }
    
    console.log(`[PDF] PDF carregado com sucesso. Total de páginas: ${pdf.numPages}`)
    
    let textoCompleto = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`[PDF] Extraindo texto da página ${i}/${pdf.numPages}...`)
      try {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        
        // Melhorar extração preservando estrutura de tabela
        // Agrupar itens por posição Y para manter linhas juntas
        const items = textContent.items.map((item: any) => ({
          str: item.str || '',
          x: item.transform?.[4] || 0,
          y: item.transform?.[5] || 0,
        }))
        
        // Agrupar por linha (mesma coordenada Y aproximada)
        const linhas: string[] = []
        const linhasY: number[] = []
        const toleranciaY = 2 // pixels de tolerância
        
        for (const item of items) {
          if (!item.str.trim()) continue
          
          // Encontrar linha existente próxima
          let linhaEncontrada = false
          for (let j = 0; j < linhasY.length; j++) {
            if (Math.abs(item.y - linhasY[j]) < toleranciaY) {
              linhas[j] += ' ' + item.str
              linhaEncontrada = true
              break
            }
          }
          
          if (!linhaEncontrada) {
            linhas.push(item.str)
            linhasY.push(item.y)
          }
        }
        
        const pageText = linhas.join('\n')
        textoCompleto += pageText + '\n'
        
        console.log(`[PDF] Página ${i}: ${linhas.length} linhas extraídas`)
      } catch (pageError: any) {
        console.error(`[PDF] Erro ao processar página ${i}:`, pageError)
        // Continuar com as outras páginas
      }
    }

    if (!textoCompleto.trim()) {
      throw new Error('O PDF não contém texto extraível. Pode ser um PDF escaneado (imagem).')
    }

    console.log('[PDF] Texto extraído com sucesso. Tamanho:', textoCompleto.length, 'caracteres')
    
    // Log de uma amostra do texto para debug
    const amostraTexto = textoCompleto.substring(0, 2000)
    console.log('[PDF] Amostra do texto extraído (primeiros 2000 caracteres):')
    console.log(amostraTexto)
    
    return textoCompleto
  } catch (error: any) {
    console.error('[PDF] Erro ao extrair texto do PDF:', error)
    console.error('[PDF] Tipo do erro:', typeof error)
    console.error('[PDF] Stack:', error?.stack)
    const errorMessage = error?.message || 'Erro desconhecido'
    
    // Mensagens de erro mais amigáveis
    if (errorMessage.includes('carregar biblioteca')) {
      throw new Error('Erro ao carregar biblioteca de PDF. Por favor, recarregue a página e tente novamente.')
    }
    
    if (errorMessage.includes('getDocument')) {
      throw new Error('Erro ao processar o PDF. A biblioteca não foi carregada corretamente. Tente recarregar a página.')
    }
    
    throw new Error(`Erro ao processar o PDF: ${errorMessage}`)
  }
}

/**
 * Converte data no formato do Inter ("DD de mês. YYYY") para Date
 */
function parsearDataInter(dataStr: string): Date | null {
  const meses: { [key: string]: number } = {
    'jan': 0, 'jan.': 0, 'janeiro': 0,
    'fev': 1, 'fev.': 1, 'fevereiro': 1,
    'mar': 2, 'mar.': 2, 'março': 2,
    'abr': 3, 'abr.': 3, 'abril': 3,
    'mai': 4, 'mai.': 4, 'maio': 4,
    'jun': 5, 'jun.': 5, 'junho': 5,
    'jul': 6, 'jul.': 6, 'julho': 6,
    'ago': 7, 'ago.': 7, 'agosto': 7,
    'set': 8, 'set.': 8, 'setembro': 8,
    'out': 9, 'out.': 9, 'outubro': 9,
    'nov': 10, 'nov.': 10, 'novembro': 10,
    'dez': 11, 'dez.': 11, 'dezembro': 11,
  }

  // Formato Inter: "10 de nov. 2025" ou "04 de jan. 2026"
  const padraoInter = /(\d{1,2})\s+de\s+([a-z]+\.?)\s+(\d{4})/i
  const match = dataStr.match(padraoInter)
  
  if (match) {
    const dia = parseInt(match[1])
    const mesNome = match[2].toLowerCase()
    const ano = parseInt(match[3])
    const mes = meses[mesNome]
    
    if (mes !== undefined && !isNaN(dia) && !isNaN(ano)) {
      return new Date(ano, mes, dia)
    }
  }

  // Tentar formato padrão DD/MM/YYYY
  const padraoPadrao = /(\d{2})\/(\d{2})\/(\d{4})/
  const matchPadrao = dataStr.match(padraoPadrao)
  
  if (matchPadrao) {
    const dia = parseInt(matchPadrao[1])
    const mes = parseInt(matchPadrao[2]) - 1
    const ano = parseInt(matchPadrao[3])
    return new Date(ano, mes, dia)
  }

  // Tentar formato DD/MM
  const padraoSimples = /(\d{2})\/(\d{2})/
  const matchSimples = dataStr.match(padraoSimples)
  
  if (matchSimples) {
    const dia = parseInt(matchSimples[1])
    const mes = parseInt(matchSimples[2]) - 1
    const anoAtual = new Date().getFullYear()
    return new Date(anoAtual, mes, dia)
  }

  return null
}

/**
 * Detecta qual banco é baseado no texto da fatura
 */
function detectarBanco(texto: string): 'inter' | 'c6' | 'generico' {
  const textoUpper = texto.toUpperCase()
  
  // Detectar C6 Bank
  if (textoUpper.includes('C6 BANK') || textoUpper.includes('C6BANK') || 
      textoUpper.includes('CARTÃO C6') || textoUpper.includes('FATURA C6')) {
    console.log('[EXTRAÇÃO] Banco detectado: C6 Bank')
    return 'c6'
  }
  
  // Detectar Inter
  if (textoUpper.includes('BANCO INTER') || textoUpper.includes('INTER') ||
      textoUpper.includes('CARTÃO INTER') || textoUpper.includes('FATURA INTER')) {
    console.log('[EXTRAÇÃO] Banco detectado: Inter')
    return 'inter'
  }
  
  // Verificar padrão de data do Inter (formato "DD de mês. YYYY")
  const padraoDataInter = /(\d{1,2}\s+de\s+[a-z]+\.?\s+\d{4})/i
  if (padraoDataInter.test(texto)) {
    console.log('[EXTRAÇÃO] Banco detectado: Inter (por padrão de data)')
    return 'inter'
  }
  
  console.log('[EXTRAÇÃO] Banco detectado: Genérico')
  return 'generico'
}

/**
 * Extrai transações de um texto de fatura de cartão
 * Suporta formato do Inter, C6 Bank e outros bancos brasileiros
 */
export function extrairTransacoesDoTexto(texto: string): TransacaoExtraida[] {
  const transacoes: TransacaoExtraida[] = []
  
  console.log('[EXTRAÇÃO] Iniciando extração de transações...')
  console.log('[EXTRAÇÃO] Tamanho do texto:', texto.length)
  
  // Detectar banco
  const banco = detectarBanco(texto)
  
  // ========== PADRÕES PARA INTER ==========
  // Padrão específico do Inter: "DD de mês. YYYY | Descrição | - | R$ VALOR"
  // Exemplo: "10 de nov. 2025 | CP PARC SHOPPING INTER (Parcela 03 de 10) | - | R$ 146,73"
  const padraoInter = /(\d{1,2}\s+de\s+[a-z]+\.?\s+\d{4})\s+\|\s+([^|]+?)\s+\|\s+[^|]*\s+\|\s+([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi
  
  // Padrão melhorado para Inter: captura data, descrição e valor mesmo em linhas diferentes
  // Formato: "DD de mês. YYYY" seguido de descrição e depois "R$ VALOR"
  // Permite descrições com caracteres especiais, parênteses, asteriscos, etc.
  // Usa non-greedy matching para capturar até encontrar R$
  const padraoInterMelhorado = /(\d{1,2}\s+de\s+[a-z]+\.?\s+\d{4})\s+([A-ZÁÉÍÓÚÇÃÊÔÀ*0-9][^R$]+?)\s+([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi
  
  // Padrão específico para tabela do Inter com pipes: "DD de mês. YYYY | Descrição | - | R$ VALOR"
  const padraoInterTabela = /(\d{1,2}\s+de\s+[a-z]+\.?\s+\d{4})\s*\|\s*([^|]+?)\s*\|\s*[^|]*\s*\|\s*([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi
  
  // Padrão mais flexível: captura qualquer sequência que tenha data do Inter, descrição e valor
  // Não exige ordem específica, apenas que os três elementos estejam próximos
  const padraoInterFlexivel = /(\d{1,2}\s+de\s+[a-z]+\.?\s+\d{4})[^R$]*?([A-ZÁÉÍÓÚÇÃÊÔÀ*][A-ZÁÉÍÓÚÇÃÊÔÀ*\s\w\.,\-\(\)\/\d]+?)[^R$]*?([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi
  
  // Padrão alternativo sem pipes (quando o texto não tem separadores claros)
  const padraoInterSemPipes = /(\d{1,2}\s+de\s+[a-z]+\.?\s+\d{4})\s+([A-ZÁÉÍÓÚÇÃÊÔÀ*][^R$]+?)\s+([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi
  
  // ========== PADRÕES PARA C6 BANK ==========
  // C6 Bank usa vários formatos, incluindo:
  // - "DD mon DESCRIÇÃO VALOR" (ex: "01 jan IFD*IFOOD CLUB 5,95") - FORMATO PRINCIPAL
  // - "DD/MM DESCRIÇÃO VALOR" 
  // - "DD/MM/YYYY DESCRIÇÃO VALOR"
  // O valor geralmente está sem R$ e usa vírgula como separador decimal
  
  // Mapeamento de meses abreviados
  const mesesAbreviados: { [key: string]: number } = {
    'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12
  }

  const padroesC6 = [
    // Padrão 1: DD mon DESCRIÇÃO VALOR (formato mais comum do C6: "01 jan IFD*IFOOD CLUB 5,95")
    // Captura data no formato "DD mon" seguida de descrição e valor com vírgula
    // Melhorado para capturar descrições que podem ter asteriscos, números, etc.
    // A descrição pode ter qualquer caractere até encontrar um número seguido de vírgula (valor)
    /(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+([A-ZÁÉÍÓÚÇÃÊÔÀ0-9*][^\d]*?)\s+(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // Padrão 2: DD/MM/YYYY DESCRIÇÃO VALOR (com R$)
    /(\d{2}\/\d{2}\/\d{4})\s+([A-ZÁÉÍÓÚÇÃÊÔÀ0-9*][A-ZÁÉÍÓÚÇÃÊÔÀ0-9*\s\w\.,\-\(\)\/\*]+?)\s+([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // Padrão 3: DD/MM DESCRIÇÃO VALOR (sem ano, com R$)
    /(\d{2}\/\d{2})\s+([A-ZÁÉÍÓÚÇÃÊÔÀ0-9*][A-ZÁÉÍÓÚÇÃÊÔÀ0-9*\s\w\.,\-\(\)\/\*]+?)\s+([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // Padrão 4: DD/MM/YYYY DESCRIÇÃO VALOR (sem R$, apenas número com vírgula)
    /(\d{2}\/\d{2}\/\d{4})\s+([A-ZÁÉÍÓÚÇÃÊÔÀ0-9*][A-ZÁÉÍÓÚÇÃÊÔÀ0-9*\s\w\.,\-\(\)\/\*]+?)\s+([+\-]?\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // Padrão 5: DD/MM DESCRIÇÃO VALOR (sem R$ e sem ano, formato mais comum)
    /(\d{2}\/\d{2})\s+([A-ZÁÉÍÓÚÇÃÊÔÀ0-9*][A-ZÁÉÍÓÚÇÃÊÔÀ0-9*\s\w\.,\-\(\)\/\*]+?)\s+([+\-]?\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // Padrão 6: DESCRIÇÃO DD/MM/YYYY R$ VALOR (ordem invertida)
    /([A-ZÁÉÍÓÚÇÃÊÔÀ0-9*][A-ZÁÉÍÓÚÇÃÊÔÀ0-9*\s\w\.,\-\(\)\/\*]+?)\s+(\d{2}\/\d{2}\/\d{4})\s+([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // Padrão 7: DESCRIÇÃO DD/MM R$ VALOR (ordem invertida, sem ano)
    /([A-ZÁÉÍÓÚÇÃÊÔÀ0-9*][A-ZÁÉÍÓÚÇÃÊÔÀ0-9*\s\w\.,\-\(\)\/\*]+?)\s+(\d{2}\/\d{2})\s+([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // Padrão 8: DD/MM/YYYY | DESCRIÇÃO | VALOR (com pipes, formato tabela)
    /(\d{2}\/\d{2}\/\d{4})\s*\|\s*([^|]+?)\s*\|\s*([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // Padrão 9: DD/MM | DESCRIÇÃO | VALOR (com pipes, sem ano)
    /(\d{2}\/\d{2})\s*\|\s*([^|]+?)\s*\|\s*([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
  ]

  // Padrões genéricos para outros bancos
  const padroesGenericos = [
    // DD/MM/YYYY DESCRIÇÃO R$ VALOR
    /(\d{2}\/\d{2}\/\d{4})\s+([A-ZÁÉÍÓÚÇÃÊÔÀ][A-ZÁÉÍÓÚÇÃÊÔÀ\s\w\.,\-]+?)\s+([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // DD/MM DESCRIÇÃO R$ VALOR
    /(\d{2}\/\d{2})\s+([A-ZÁÉÍÓÚÇÃÊÔÀ][A-ZÁÉÍÓÚÇÃÊÔÀ\s\w\.,\-]+?)\s+([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // DESCRIÇÃO DD/MM R$ VALOR
    /([A-ZÁÉÍÓÚÇÃÊÔÀ][A-ZÁÉÍÓÚÇÃÊÔÀ\s\w\.,\-]+?)\s+(\d{2}\/\d{2})\s+([+\-]?\s*R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
  ]

  // Processar o texto completo primeiro (não apenas linha por linha)
  // Isso ajuda a capturar transações que podem estar em múltiplas linhas
  const textoNormalizado = texto.replace(/\n+/g, ' ').replace(/\s+/g, ' ')
  
  // Também criar uma versão que preserva quebras de linha mas normaliza espaços
  const textoComQuebras = texto.split('\n').map(linha => linha.trim()).filter(linha => linha.length > 0).join('\n')
  
  console.log('[EXTRAÇÃO] Processando texto normalizado...')
  console.log('[EXTRAÇÃO] Primeiros 1000 caracteres:', textoNormalizado.substring(0, 1000))
  console.log('[EXTRAÇÃO] Total de linhas no texto original:', texto.split('\n').length)
  
  // Processar baseado no banco detectado
  if (banco === 'c6') {
    console.log('[EXTRAÇÃO] Processando com padrões do C6 Bank...')
    
    // Extrair ano do contexto da fatura (procurar por padrões como "2026", "FATURA 01/2026", etc.)
    let anoReferencia = new Date().getFullYear()
    const padraoAno = /(?:FATURA|REFERÊNCIA|PERÍODO|VENCIMENTO).*?(\d{4})|(\d{2}\/\d{2}\/(\d{4}))/i
    const matchAno = texto.match(padraoAno)
    if (matchAno) {
      const anoEncontrado = parseInt(matchAno[1] || matchAno[3] || '0')
      if (anoEncontrado >= 2020 && anoEncontrado <= 2100) {
        anoReferencia = anoEncontrado
        console.log('[EXTRAÇÃO] Ano de referência detectado:', anoReferencia)
      }
    }
    
    // Processar também linha por linha para melhor captura
    const linhas = textoComQuebras.split('\n')
    
    // Processar C6 Bank
    for (let padraoIndex = 0; padraoIndex < padroesC6.length; padraoIndex++) {
      const padrao = padroesC6[padraoIndex]
      
      // Tentar no texto normalizado
      padrao.lastIndex = 0
      const matchesNormalizado = Array.from(textoNormalizado.matchAll(padrao))
      console.log(`[EXTRAÇÃO] Padrão C6 ${padraoIndex + 1} (normalizado) encontrou: ${matchesNormalizado.length} matches`)
      
      // Tentar linha por linha (mais eficaz para C6)
      const matchesPorLinha: any[] = []
      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i].trim()
        
        // Para o padrão 1 (DD mon), processar linha individual primeiro
        if (padraoIndex === 0) {
          padrao.lastIndex = 0
          const matchesLinhaIndividual = Array.from(linha.matchAll(padrao))
          matchesPorLinha.push(...matchesLinhaIndividual)
        }
        
        // Também verificar linhas próximas (até 2 linhas à frente) para capturar transações quebradas
        const linhasCombinadas = linhas.slice(i, Math.min(i + 3, linhas.length)).join(' ')
        padrao.lastIndex = 0
        const matchesLinha = Array.from(linhasCombinadas.matchAll(padrao))
        // Evitar duplicatas se já processamos a linha individual
        if (padraoIndex !== 0) {
          matchesPorLinha.push(...matchesLinha)
        }
      }
      console.log(`[EXTRAÇÃO] Padrão C6 ${padraoIndex + 1} (linha por linha) encontrou: ${matchesPorLinha.length} matches`)
      
      const todosMatches = [...matchesNormalizado, ...matchesPorLinha]
      
      for (const match of todosMatches) {
        try {
          let dataStr = ''
          let mesAbreviado = ''
          let descricao = ''
          let valorStr = ''
          
          // Padrão 1 é especial: formato "DD mon DESCRIÇÃO VALOR"
          if (padraoIndex === 0) {
            const dia = parseInt(match[1]?.trim() || '0')
            mesAbreviado = match[2]?.trim().toLowerCase() || ''
            descricao = match[3]?.trim() || ''
            valorStr = match[4]?.trim() || ''
            
            if (!dia || !mesAbreviado || !descricao || !valorStr) continue
            
            // Converter mês abreviado para número
            const mesNum = mesesAbreviados[mesAbreviado]
            if (!mesNum) continue
            
            // Usar ano de referência extraído do contexto
            const data = new Date(anoReferencia, mesNum - 1, dia)
            
            // Parsear valor (formato com vírgula: "5,95")
            const valorLimpo = valorStr
              .replace(/\./g, '')
              .replace(',', '.')
              .trim()
            
            const valor = parseFloat(valorLimpo)
            if (isNaN(valor) || valor <= 0) continue

            // Limpar descrição
            descricao = descricao
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 200)

            if (descricao.length < 3) continue

            // Verificar se não é uma linha de total ou resumo
            const palavrasIgnorar = ['TOTAL', 'SUBTOTAL', 'RESUMO', 'FATURA', 'VENCIMENTO', 'PAGAMENTO', 'SALDO', 'CARTÃO', 'BENEFICIÁRIO', 'MOVIMENTAÇÃO', 'DATA', 'DESPESAS DO MÊS', 'VALOR ANTECIPADO', 'C6 BANK', 'C6BANK', 'TRANSACOES', 'VALORES EM REAIS', 'LEMBRANDO']
            const descricaoUpper = descricao.toUpperCase()
            if (palavrasIgnorar.some(palavra => descricaoUpper === palavra || (descricaoUpper.includes(palavra) && descricao.length < 50))) {
              console.log('[EXTRAÇÃO] Ignorando linha de resumo:', descricao)
              continue
            }
            
            // Ignorar se a descrição é apenas um hífen ou pipe
            if (descricao.match(/^[\s|\-]+$/)) {
              continue
            }

            transacoes.push({
              descricao,
              valor,
              data: data.toISOString().split('T')[0],
            })
            console.log('[EXTRAÇÃO] Transação C6 (DD mon) adicionada:', descricao.substring(0, 30), valor, data.toISOString().split('T')[0])
            continue
          }
          
          // Outros padrões (DD/MM ou DD/MM/YYYY)
          dataStr = match[1]?.trim() || ''
          descricao = match[2]?.trim() || ''
          valorStr = match[3]?.trim() || ''
          
          // Se o padrão tem ordem invertida (descrição primeiro)
          if (match.length >= 4 && !dataStr.match(/\d{2}\/\d{2}/)) {
            descricao = match[1]?.trim() || ''
            dataStr = match[2]?.trim() || ''
            valorStr = match[3]?.trim() || ''
          }

          if (!dataStr || !descricao || !valorStr) continue

          // Ignorar créditos (valores com "+")
          if (valorStr.includes('+')) continue

          // Parsear data do C6 (formato DD/MM/YYYY ou DD/MM)
          let data: Date | null = null
          if (dataStr.includes('/')) {
            const partes = dataStr.split('/')
            if (partes.length === 3) {
              const dia = parseInt(partes[0])
              const mes = parseInt(partes[1]) - 1
              const ano = parseInt(partes[2])
              data = new Date(ano, mes, dia)
            } else if (partes.length === 2) {
              const dia = parseInt(partes[0])
              const mes = parseInt(partes[1]) - 1
              const anoAtual = new Date().getFullYear()
              data = new Date(anoAtual, mes, dia)
            }
          }

          if (!data) continue

          // Parsear valor (pode ter ou não R$)
          const valorLimpo = valorStr
            .replace(/[+\-R$]/gi, '')
            .replace(/\./g, '')
            .replace(',', '.')
            .trim()
          
          const valor = parseFloat(valorLimpo)
          if (isNaN(valor) || valor <= 0) continue

          // Limpar descrição
          descricao = descricao
            .replace(/\s+/g, ' ')
            .replace(/[|\-]+$/g, '')
            .trim()
            .substring(0, 200)

          if (descricao.length < 3) continue

          // Verificar se não é uma linha de total ou resumo
          const palavrasIgnorar = ['TOTAL', 'SUBTOTAL', 'RESUMO', 'FATURA', 'VENCIMENTO', 'PAGAMENTO', 'SALDO', 'CARTÃO', 'BENEFICIÁRIO', 'MOVIMENTAÇÃO', 'DATA', 'DESPESAS DO MÊS', 'VALOR ANTECIPADO', 'C6 BANK', 'C6BANK', 'TRANSACOES', 'VALORES EM REAIS', 'LEMBRANDO']
          const descricaoUpper = descricao.toUpperCase()
          if (palavrasIgnorar.some(palavra => descricaoUpper === palavra || (descricaoUpper.includes(palavra) && descricao.length < 50))) {
            console.log('[EXTRAÇÃO] Ignorando linha de resumo:', descricao)
            continue
          }
          
          // Ignorar se a descrição é apenas um hífen ou pipe
          if (descricao.match(/^[\s|\-]+$/)) {
            continue
          }

          transacoes.push({
            descricao,
            valor,
            data: data.toISOString().split('T')[0],
          })
          console.log('[EXTRAÇÃO] Transação C6 adicionada:', descricao.substring(0, 30), valor, data.toISOString().split('T')[0])
        } catch (error) {
          console.error('[EXTRAÇÃO] Erro ao processar match C6:', error)
          continue
        }
      }
    }
  }
  
  // Primeiro, tentar padrão melhorado do Inter no texto completo (se for Inter ou genérico)
  // Resetar o regex (importante para matchAll)
  padraoInterMelhorado.lastIndex = 0
  const matchesInterMelhorado = Array.from(textoNormalizado.matchAll(padraoInterMelhorado))
  console.log('[EXTRAÇÃO] Padrão melhorado encontrou:', matchesInterMelhorado.length, 'matches')
  
  // Tentar no texto com quebras de linha preservadas
  padraoInterMelhorado.lastIndex = 0
  const matchesInterComQuebras = Array.from(textoComQuebras.matchAll(padraoInterMelhorado))
  console.log('[EXTRAÇÃO] Padrão melhorado (com quebras) encontrou:', matchesInterComQuebras.length, 'matches')
  
  // Tentar padrão de tabela com pipes
  padraoInterTabela.lastIndex = 0
  const matchesInterTabela = Array.from(textoNormalizado.matchAll(padraoInterTabela))
  console.log('[EXTRAÇÃO] Padrão tabela encontrou:', matchesInterTabela.length, 'matches')
  
  padraoInterTabela.lastIndex = 0
  const matchesInterTabelaComQuebras = Array.from(textoComQuebras.matchAll(padraoInterTabela))
  console.log('[EXTRAÇÃO] Padrão tabela (com quebras) encontrou:', matchesInterTabelaComQuebras.length, 'matches')
  
  // Tentar padrão flexível
  padraoInterFlexivel.lastIndex = 0
  const matchesInterFlexivel = Array.from(textoNormalizado.matchAll(padraoInterFlexivel))
  console.log('[EXTRAÇÃO] Padrão flexível encontrou:', matchesInterFlexivel.length, 'matches')
  
  padraoInterFlexivel.lastIndex = 0
  const matchesInterFlexivelComQuebras = Array.from(textoComQuebras.matchAll(padraoInterFlexivel))
  console.log('[EXTRAÇÃO] Padrão flexível (com quebras) encontrou:', matchesInterFlexivelComQuebras.length, 'matches')
  
  // Processar também linha por linha para capturar transações que podem estar em formatos diferentes
  const linhas = textoComQuebras.split('\n')
  const matchesPorLinha: any[] = []
  
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    const proximasLinhas = linhas.slice(i, Math.min(i + 3, linhas.length)).join(' ')
    
    // Tentar padrão melhorado na linha atual e próximas
    padraoInterMelhorado.lastIndex = 0
    const matchesLinha = Array.from(proximasLinhas.matchAll(padraoInterMelhorado))
    matchesPorLinha.push(...matchesLinha)
    
    padraoInterTabela.lastIndex = 0
    const matchesTabelaLinha = Array.from(proximasLinhas.matchAll(padraoInterTabela))
    matchesPorLinha.push(...matchesTabelaLinha)
  }
  
  console.log('[EXTRAÇÃO] Padrão linha por linha encontrou:', matchesPorLinha.length, 'matches')
  
  // Combinar todos os matches
  const todosMatches = [
    ...matchesInterMelhorado, 
    ...matchesInterComQuebras,
    ...matchesInterTabela,
    ...matchesInterTabelaComQuebras,
    ...matchesInterFlexivel,
    ...matchesInterFlexivelComQuebras,
    ...matchesPorLinha
  ]
  
  console.log('[EXTRAÇÃO] Total de matches encontrados (antes de remover duplicatas):', todosMatches.length)
  
  for (const match of todosMatches) {
    try {
      const dataStr = match[1]?.trim() || ''
      let descricao = match[2]?.trim() || ''
      let valorStr = match[3]?.trim() || ''

      if (!dataStr || !descricao || !valorStr) continue

      // Ignorar créditos (valores com "+")
      if (valorStr.includes('+')) continue

      const data = parsearDataInter(dataStr)
      if (!data) {
        console.log('[EXTRAÇÃO] Data não parseada:', dataStr)
        continue
      }

      // Parsear valor
      const valorLimpo = valorStr
        .replace(/[+\-R$]/gi, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim()
      
      const valor = parseFloat(valorLimpo)
      if (isNaN(valor) || valor <= 0) continue

      // Limpar descrição - remover caracteres especiais no final
      descricao = descricao
        .replace(/\s+/g, ' ')
        .replace(/[|\-]+$/g, '') // Remover pipes e hífens no final
        .trim()
        .substring(0, 200)

      if (descricao.length < 3) continue

      // Verificar se não é uma linha de total ou resumo
      const palavrasIgnorar = ['TOTAL', 'SUBTOTAL', 'RESUMO', 'FATURA', 'VENCIMENTO', 'PAGAMENTO', 'SALDO', 'CARTÃO', 'BENEFICIÁRIO', 'MOVIMENTAÇÃO', 'DATA', 'DESPESAS DO MÊS', 'VALOR ANTECIPADO']
      const descricaoUpper = descricao.toUpperCase()
      if (palavrasIgnorar.some(palavra => descricaoUpper === palavra || (descricaoUpper.includes(palavra) && descricao.length < 50))) {
        console.log('[EXTRAÇÃO] Ignorando linha de resumo:', descricao)
        continue
      }
      
      // Ignorar se a descrição é apenas um hífen ou pipe
      if (descricao.match(/^[\s|\-]+$/)) {
        continue
      }

      transacoes.push({
        descricao,
        valor,
        data: data.toISOString().split('T')[0],
      })
      console.log('[EXTRAÇÃO] Transação adicionada:', descricao.substring(0, 30), valor, data.toISOString().split('T')[0])
    } catch (error) {
      console.error('[EXTRAÇÃO] Erro ao processar match:', error)
      continue
    }
  }
  
  // Também processar linha por linha para capturar outros formatos
  // Usar a variável linhas já definida anteriormente (linha 377)
  // Primeiro, tentar padrão específico do Inter
  for (const linha of linhas) {
    if (linha.trim().length < 10) continue
    
    // Tentar padrão Inter com pipes
    const matchesInter = Array.from(linha.matchAll(padraoInter))
    for (const match of matchesInter) {
      try {
        const dataStr = match[1]?.trim() || ''
        let descricao = match[2]?.trim() || ''
        let valorStr = match[3]?.trim() || ''

        if (!dataStr || !descricao || !valorStr) continue

        // Ignorar créditos (valores com "+")
        if (valorStr.includes('+')) continue

        const data = parsearDataInter(dataStr)
        if (!data) continue

        // Parsear valor
        const valorLimpo = valorStr
          .replace(/[+\-R$]/gi, '')
          .replace(/\./g, '')
          .replace(',', '.')
          .trim()
        
        const valor = parseFloat(valorLimpo)
        if (isNaN(valor) || valor <= 0) continue

        // Limpar descrição
        descricao = descricao
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 200)

        if (descricao.length < 3) continue

        // Verificar se não é uma linha de total ou resumo
        const palavrasIgnorar = ['TOTAL', 'SUBTOTAL', 'RESUMO', 'FATURA', 'VENCIMENTO', 'PAGAMENTO', 'SALDO', 'CARTÃO', 'BENEFICIÁRIO', 'MOVIMENTAÇÃO']
        if (palavrasIgnorar.some(palavra => descricao.toUpperCase().includes(palavra) && descricao.length < 50)) {
          continue
        }

        transacoes.push({
          descricao,
          valor,
          data: data.toISOString().split('T')[0],
        })
      } catch (error) {
        continue
      }
    }

    // Tentar padrão Inter sem pipes
    const matchesInterSemPipes = Array.from(linha.matchAll(padraoInterSemPipes))
    for (const match of matchesInterSemPipes) {
      try {
        const dataStr = match[1]?.trim() || ''
        let descricao = match[2]?.trim() || ''
        let valorStr = match[3]?.trim() || ''

        if (!dataStr || !descricao || !valorStr) continue

        // Ignorar créditos
        if (valorStr.includes('+')) continue

        const data = parsearDataInter(dataStr)
        if (!data) continue

        const valorLimpo = valorStr
          .replace(/[+\-R$]/gi, '')
          .replace(/\./g, '')
          .replace(',', '.')
          .trim()
        
        const valor = parseFloat(valorLimpo)
        if (isNaN(valor) || valor <= 0) continue

        descricao = descricao.replace(/\s+/g, ' ').trim().substring(0, 200)
        if (descricao.length < 3) continue

        const palavrasIgnorar = ['TOTAL', 'SUBTOTAL', 'RESUMO', 'FATURA', 'VENCIMENTO', 'PAGAMENTO', 'SALDO']
        if (palavrasIgnorar.some(palavra => descricao.toUpperCase().includes(palavra))) {
          continue
        }

        transacoes.push({
          descricao,
          valor,
          data: data.toISOString().split('T')[0],
        })
      } catch (error) {
        continue
      }
    }

    // Tentar padrões genéricos
    for (const padrao of padroesGenericos) {
      const matches = Array.from(linha.matchAll(padrao))
      for (const match of matches) {
        try {
          let dataStr = ''
          let descricao = ''
          let valorStr = ''

          if (match.length >= 4) {
            dataStr = match[1]
            descricao = match[2]?.trim() || ''
            valorStr = match[3]?.trim() || ''
          } else {
            descricao = match[1]?.trim() || ''
            dataStr = match[2] || ''
            valorStr = match[3]?.trim() || ''
          }

          if (!dataStr || !descricao || !valorStr) continue

          // Ignorar créditos
          if (valorStr.includes('+')) continue

          let data: Date | null = null
          
          // Tentar parsear como data do Inter primeiro
          data = parsearDataInter(dataStr)
          
          // Se não funcionou, tentar formato padrão
          if (!data && dataStr.includes('/')) {
            const partes = dataStr.split('/')
            if (partes.length === 3) {
              const dia = parseInt(partes[0])
              const mes = parseInt(partes[1]) - 1
              const ano = parseInt(partes[2])
              data = new Date(ano, mes, dia)
            } else if (partes.length === 2) {
              const dia = parseInt(partes[0])
              const mes = parseInt(partes[1]) - 1
              const anoAtual = new Date().getFullYear()
              data = new Date(anoAtual, mes, dia)
            }
          }

          if (!data) continue

          const valorLimpo = valorStr
            .replace(/[+\-R$]/gi, '')
            .replace(/\./g, '')
            .replace(',', '.')
            .trim()
          
          const valor = parseFloat(valorLimpo)
          if (isNaN(valor) || valor <= 0) continue

          descricao = descricao.replace(/\s+/g, ' ').trim().substring(0, 200)
          if (descricao.length < 3) continue

          const palavrasIgnorar = ['TOTAL', 'SUBTOTAL', 'RESUMO', 'FATURA', 'VENCIMENTO', 'PAGAMENTO', 'SALDO']
          if (palavrasIgnorar.some(palavra => descricao.toUpperCase().includes(palavra))) {
            continue
          }

          transacoes.push({
            descricao,
            valor,
            data: data.toISOString().split('T')[0],
          })
        } catch (error) {
          continue
        }
      }
    }
  }

  // Remover duplicatas (considerando pequenas variações)
  const transacoesUnicas = transacoes.filter((transacao, index, self) => {
    // Normalizar descrição para comparação (remover espaços extras, converter para maiúsculas)
    const descricaoNormalizada = transacao.descricao.replace(/\s+/g, ' ').trim().toUpperCase()
    
    return index === self.findIndex(t => {
      const tDescricaoNormalizada = t.descricao.replace(/\s+/g, ' ').trim().toUpperCase()
      return (
        tDescricaoNormalizada === descricaoNormalizada &&
        Math.abs(t.valor - transacao.valor) < 0.01 &&
        t.data === transacao.data
      )
    })
  })
  
  // Ordenar por data
  transacoesUnicas.sort((a, b) => {
    const dataA = new Date(a.data)
    const dataB = new Date(b.data)
    return dataA.getTime() - dataB.getTime()
  })

  console.log('[EXTRAÇÃO] Total de transações encontradas:', transacoesUnicas.length)
  console.log('[EXTRAÇÃO] Transações:', transacoesUnicas.map(t => `${t.descricao.substring(0, 30)} - R$ ${t.valor} - ${t.data}`))

  return transacoesUnicas
}

/**
 * Tenta identificar o mês e ano de referência da fatura a partir do texto
 * Suporta formato do Inter, C6 Bank e outros bancos
 */
export function extrairMesAnoReferencia(texto: string): { mes: number; ano: number } | null {
  const meses: { [key: string]: number } = {
    'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4, 'maio': 5, 'junho': 6,
    'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12,
    'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12
  }

  // Detectar banco
  const banco = detectarBanco(texto)

  // Padrão 1: VENCIMENTO DD/MM/YYYY (Inter e C6 Bank usam isso)
  const padraoVencimento = /VENCIMENTO\s+(\d{2})\/(\d{2})\/(\d{4})/i
  const matchVencimento = texto.match(padraoVencimento)
  if (matchVencimento) {
    const mes = parseInt(matchVencimento[2])
    const ano = parseInt(matchVencimento[3])
    if (mes >= 1 && mes <= 12 && ano >= 2020 && ano <= 2100) {
      // O mês de referência é o mês anterior ao vencimento
      const mesReferencia = mes === 1 ? 12 : mes - 1
      const anoReferencia = mes === 1 ? ano - 1 : ano
      return { mes: mesReferencia, ano: anoReferencia }
    }
  }

  // Padrão específico para C6 Bank: FATURA DE MÊS/ANO ou REFERÊNCIA MÊS/ANO
  if (banco === 'c6') {
    // Padrão: FATURA DE 01/2026 ou REFERÊNCIA 01/2026
    const padraoC6 = /(?:FATURA|REFERÊNCIA|PERÍODO)\s+(?:DE\s+)?(\d{2})\/(\d{4})/i
    const matchC6 = texto.match(padraoC6)
    if (matchC6) {
      const mes = parseInt(matchC6[1])
      const ano = parseInt(matchC6[2])
      if (mes >= 1 && mes <= 12 && ano >= 2020 && ano <= 2100) {
        return { mes, ano }
      }
    }
    
    // Padrão alternativo: procurar por datas no formato DD/MM/YYYY e usar o mês mais comum
    const padraoDataC6 = /(\d{2})\/(\d{2})\/(\d{4})/g
    const matches = Array.from(texto.matchAll(padraoDataC6))
    if (matches.length > 0) {
      const mesesEncontrados: { [key: number]: number } = {}
      for (const match of matches) {
        const mes = parseInt(match[2])
        if (mes >= 1 && mes <= 12) {
          mesesEncontrados[mes] = (mesesEncontrados[mes] || 0) + 1
        }
      }
      
      // Pegar o mês mais frequente
      let mesMaisFrequente = 0
      let maiorFrequencia = 0
      for (const [mes, freq] of Object.entries(mesesEncontrados)) {
        if (freq > maiorFrequencia) {
          maiorFrequencia = freq
          mesMaisFrequente = parseInt(mes)
        }
      }
      
      if (mesMaisFrequente > 0) {
        const ano = parseInt(matches[0][3])
        if (ano >= 2020 && ano <= 2100) {
          return { mes: mesMaisFrequente, ano }
        }
      }
    }
  }

  // Padrão 2: FATURA DE MÊS/ANO ou REFERÊNCIA MÊS/ANO
  const padroes = [
    /(?:FATURA|REFERÊNCIA|PERÍODO)\s+(?:DE\s+)?([A-ZÁÉÍÓÚÇÃÊÔÀ]+)\s+(\d{4})/i,
    /([A-ZÁÉÍÓÚÇÃÊÔÀ]+)\s+(\d{4})/i,
    /(\d{2})\/(\d{4})/,
  ]

  for (const padrao of padroes) {
    const match = texto.match(padrao)
    if (match) {
      if (match[1] && match[2]) {
        // Tentar identificar mês por nome
        const mesNome = match[1].toLowerCase()
        const mesNum = meses[mesNome]
        
        if (mesNum) {
          const ano = parseInt(match[2])
          if (ano >= 2020 && ano <= 2100) {
            return { mes: mesNum, ano }
          }
        }
        
        // Tentar identificar mês por número
        const mesNumInt = parseInt(match[1])
        if (mesNumInt >= 1 && mesNumInt <= 12) {
          const ano = parseInt(match[2])
          if (ano >= 2020 && ano <= 2100) {
            return { mes: mesNumInt, ano }
          }
        }
      }
    }
  }

  // Padrão 3: Procurar por datas no formato "DD de mês. YYYY" e usar o mês mais comum
  const padraoDataInter = /(\d{1,2})\s+de\s+([a-z]+\.?)\s+(\d{4})/gi
  const matches = Array.from(texto.matchAll(padraoDataInter))
  if (matches.length > 0) {
    const mesesEncontrados: { [key: number]: number } = {}
    for (const match of matches) {
      const mesNome = match[2].toLowerCase().replace('.', '')
      const mesNum = meses[mesNome]
      if (mesNum) {
        mesesEncontrados[mesNum] = (mesesEncontrados[mesNum] || 0) + 1
      }
    }
    
    // Pegar o mês mais frequente
    let mesMaisFrequente = 0
    let maiorFrequencia = 0
    for (const [mes, freq] of Object.entries(mesesEncontrados)) {
      if (freq > maiorFrequencia) {
        maiorFrequencia = freq
        mesMaisFrequente = parseInt(mes)
      }
    }
    
    if (mesMaisFrequente > 0) {
      const ano = parseInt(matches[0][3])
      if (ano >= 2020 && ano <= 2100) {
        return { mes: mesMaisFrequente, ano }
      }
    }
  }

  // Se não encontrou, retornar mês atual
  const agora = new Date()
  return { mes: agora.getMonth() + 1, ano: agora.getFullYear() }
}
