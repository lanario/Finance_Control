/**
 * Stub para pdf-extractor no servidor
 * Este arquivo é usado apenas no build do servidor para evitar erros
 */

export interface TransacaoExtraida {
  descricao: string
  valor: number
  data: string
  categoria?: string
}

export async function extrairTextoDoPDF(file: File): Promise<string> {
  throw new Error('PDF extraction só funciona no cliente')
}

export function extrairTransacoesDoTexto(texto: string): TransacaoExtraida[] {
  return []
}

export function extrairMesAnoReferencia(texto: string): { mes: number; ano: number } | null {
  return null
}
