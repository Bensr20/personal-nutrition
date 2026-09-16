import type { Meal } from '@/types/domain'
import { Modal } from '@/components/ui/Modal'
import { Pencil, Copy, Star, Trash2 } from '@/components/ui/icons'

interface Props {
  meal: Meal | null
  onClose: () => void
  onEdit: (meal: Meal) => void
  onDuplicate: (meal: Meal) => void
  onSaveFavorite: (meal: Meal) => void
  onDelete: (meal: Meal) => void
}

export function MealActionsModal({ meal, onClose, onEdit, onDuplicate, onSaveFavorite, onDelete }: Props) {
  if (!meal) return null

  const items = [
    { label: 'עריכה', icon: Pencil, action: () => onEdit(meal), tone: 'default' as const },
    { label: 'שכפול ליום אחר', icon: Copy, action: () => onDuplicate(meal), tone: 'default' as const },
    { label: 'שמירה כמועדף', icon: Star, action: () => onSaveFavorite(meal), tone: 'default' as const },
    { label: 'מחיקה', icon: Trash2, action: () => onDelete(meal), tone: 'danger' as const },
  ]

  return (
    <Modal open={!!meal} onClose={onClose} title="פעולות על הארוחה">
      <div className="flex flex-col gap-1">
        {items.map(({ label, icon: Icon, action, tone }) => (
          <button
            key={label}
            onClick={() => {
              action()
              onClose()
            }}
            className={[
              'flex items-center gap-3 rounded-control px-3.5 py-3.5 text-body font-medium transition-colors',
              tone === 'danger' ? 'text-coral-600 hover:bg-coral-50' : 'text-ink-800 hover:bg-bg',
            ].join(' ')}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </Modal>
  )
}
