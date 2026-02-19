/**
 * Formata uma data no formato brasileiro (dd/mm/yyyy).
 */
export function formatDate(date: string | Date): string {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${d}/${m}/${y}`
  }
  return dateStr
}

/**
 * Formata valor no padrão de moeda brasileiro.
 */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || isNaN(valor)) {
    return '0,00'
  }
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
