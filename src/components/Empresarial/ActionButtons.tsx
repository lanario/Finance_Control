'use client'

import { FiEdit, FiTrash2, FiCheck, FiXCircle, FiEye, FiDownload } from 'react-icons/fi'

interface ActionButtonsProps {
  onEdit?: () => void
  onDelete?: () => void
  onToggleActive?: () => void
  isActive?: boolean
  onView?: () => void
  onDownload?: () => void
  showEdit?: boolean
  showDelete?: boolean
  showToggle?: boolean
  showView?: boolean
  showDownload?: boolean
  editTitle?: string
  deleteTitle?: string
  toggleTitle?: string
  viewTitle?: string
  downloadTitle?: string
}

export default function ActionButtons({
  onEdit,
  onDelete,
  onToggleActive,
  isActive,
  onView,
  onDownload,
  showEdit = true,
  showDelete = true,
  showToggle = false,
  showView = false,
  showDownload = false,
  editTitle = 'Editar',
  deleteTitle = 'Excluir',
  toggleTitle,
  viewTitle = 'Visualizar',
  downloadTitle = 'Baixar PDF',
}: ActionButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      {showToggle && onToggleActive && (
        <button
          onClick={onToggleActive}
          className={`
            group relative flex items-center justify-center
            w-9 h-9 rounded-lg
            transition-all duration-200
            ${isActive
              ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 hover:border-yellow-400 hover:scale-110'
              : 'bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 hover:border-green-400 hover:scale-110'
            }
            shadow-lg hover:shadow-xl
            active:scale-95
          `}
          title={toggleTitle || (isActive ? 'Desativar' : 'Ativar')}
        >
          {isActive ? (
            <FiXCircle className="w-4 h-4 transition-transform group-hover:rotate-90" />
          ) : (
            <FiCheck className="w-4 h-4 transition-transform group-hover:scale-110" />
          )}
        </button>
      )}

      {showView && onView && (
        <button
          onClick={onView}
          className="
            group relative flex items-center justify-center
            w-9 h-9 rounded-lg
            bg-purple-500/20 border border-purple-500/50
            text-purple-400
            hover:bg-purple-500/30 hover:border-purple-400
            hover:scale-110
            transition-all duration-200
            shadow-lg hover:shadow-xl hover:shadow-purple-500/20
            active:scale-95
          "
          title={viewTitle}
        >
          <FiEye className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>
      )}

      {showDownload && onDownload && (
        <button
          onClick={onDownload}
          className="
            group relative flex items-center justify-center
            w-9 h-9 rounded-lg
            bg-green-500/20 border border-green-500/50
            text-green-400
            hover:bg-green-500/30 hover:border-green-400
            hover:scale-110
            transition-all duration-200
            shadow-lg hover:shadow-xl hover:shadow-green-500/20
            active:scale-95
          "
          title={downloadTitle || 'Baixar PDF'}
        >
          <FiDownload className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>
      )}

      {showEdit && onEdit && (
        <button
          onClick={onEdit}
          className="
            group relative flex items-center justify-center
            w-9 h-9 rounded-lg
            bg-blue-500/20 border border-blue-500/50
            text-blue-400
            hover:bg-blue-500/30 hover:border-blue-400
            hover:scale-110
            transition-all duration-200
            shadow-lg hover:shadow-xl hover:shadow-blue-500/20
            active:scale-95
          "
          title={editTitle}
        >
          <FiEdit className="w-4 h-4 transition-transform group-hover:rotate-12" />
        </button>
      )}

      {showDelete && onDelete && (
        <button
          onClick={onDelete}
          className="
            group relative flex items-center justify-center
            w-9 h-9 rounded-lg
            bg-red-500/20 border border-red-500/50
            text-red-400
            hover:bg-red-500/30 hover:border-red-400
            hover:scale-110
            transition-all duration-200
            shadow-lg hover:shadow-xl hover:shadow-red-500/20
            active:scale-95
          "
          title={deleteTitle}
        >
          <FiTrash2 className="w-4 h-4 transition-transform group-hover:scale-110 group-hover:rotate-12" />
        </button>
      )}
    </div>
  )
}

