/**
 * Formata uma data no formato brasileiro (dd/mm/yyyy)
 * Evita problemas de timezone ao trabalhar com datas no formato YYYY-MM-DD
 */
export function formatDate(date: string | Date): string {
  let dateStr: string
  
  if (date instanceof Date) {
    // Se for Date, extrair apenas a parte da data (sem hora)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    dateStr = `${year}-${month}-${day}`
  } else {
    dateStr = date
  }
  
  // Se a data está no formato YYYY-MM-DD, converter para DD/MM/YYYY
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }
  
  // Se já estiver em outro formato, tentar parsear como Date
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear()
    const month = String(parsed.getMonth() + 1).padStart(2, '0')
    const day = String(parsed.getDate()).padStart(2, '0')
    return `${day}/${month}/${year}`
  }
  
  return dateStr
}
