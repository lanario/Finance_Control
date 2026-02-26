'use client'

import { FiCalendar } from 'react-icons/fi'

export interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  /** Rótulo exibido acima do campo */
  label?: string
  /** Valor no formato YYYY-MM-DD */
  value: string
  /** Classe aplicada ao wrapper do campo */
  containerClassName?: string
  /** Classe aplicada ao label */
  labelClassName?: string
  /** Exibir dica "Clique para abrir o calendário" abaixo do campo (padrão: true) */
  showHint?: boolean
}

/**
 * Converte YYYY-MM-DD para string de exibição dd/mm/yyyy.
 * Retorna string vazia se value estiver vazio.
 */
function formatDateForDisplay(value: string): string {
  if (!value || !value.trim()) return ''
  if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }
  return value
}

/**
 * Campo de data reutilizável com visual consistente (ícone de calendário, bordas arredondadas).
 * Exibe sempre a data no formato dia/mês/ano (dd/mm/yyyy); o valor interno permanece YYYY-MM-DD.
 * Usa input nativo type="date" para o calendário; a exibição é sobrescrita para o padrão brasileiro.
 */
function DateInput({
  label,
  value,
  onChange,
  required,
  disabled,
  containerClassName = '',
  labelClassName = '',
  className = '',
  id,
  showHint = true,
  ...rest
}: DateInputProps) {
  const inputId = id ?? (label ? `date-${label.replace(/\s/g, '-').toLowerCase()}` : undefined)
  const displayText = formatDateForDisplay(value)

  return (
    <div className={`date-input-wrapper ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium text-gray-300 mb-2 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative group">
        <input
          type="date"
          id={inputId}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          title="Clique para abrir o calendário"
          className={`
            date-input
            date-input-native
            w-full pl-4 pr-12 py-3
            bg-gray-700/90 border border-gray-600 rounded-xl
            text-white placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:border-purple-500
            hover:border-gray-500
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-600
            [color-scheme:dark]
            ${className}
          `.trim().replace(/\s+/g, ' ')}
          {...rest}
        />
        <span
          className={`date-input-overlay pointer-events-none absolute left-4 right-12 top-1/2 -translate-y-1/2 truncate text-sm ${displayText ? 'text-white font-medium' : 'text-gray-500'}`}
          aria-hidden
        >
          {displayText || 'dd/mm/aaaa'}
        </span>
        <span
          className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/20 text-purple-300 group-hover:bg-purple-500/30 transition-colors"
          aria-hidden
        >
          <FiCalendar className="w-5 h-5" />
        </span>
      </div>
      {showHint && (
        <p className="mt-1.5 text-xs text-gray-500">Clique para abrir o calendário</p>
      )}
    </div>
  )
}

export { DateInput }
