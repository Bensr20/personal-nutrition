import { useEffect, useState } from 'react'
import type { FavoriteMeal } from '@/types/domain'
import { MEAL_TYPE_LABELS } from '@/types/domain'
import { Modal } from '@/components/ui/Modal'
import { Spinner, EmptyState, Pill } from '@/components/ui/Misc'
import { favoritesService } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { Star } from '@/components/ui/icons'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (favorite: FavoriteMeal) => void
}

export function FavoritesPickerModal({ open, onClose, onSelect }: Props) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([])

  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    favoritesService
      .listFavorites(user.id)
      .then(setFavorites)
      .finally(() => setLoading(false))
  }, [open, user])

  return (
    <Modal open={open} onClose={onClose} title="בחירה ממועדפים">
      {loading ? (
        <Spinner />
      ) : favorites.length === 0 ? (
        <EmptyState icon={<Star className="h-5 w-5" aria-hidden />} title="אין עדיין ארוחות מועדפות" description="שמרו ארוחה כמועדפת מתוך היומן כדי שתופיע כאן" />
      ) : (
        <ul className="flex flex-col gap-2">
          {favorites.map((fav) => (
            <li key={fav.id}>
              <button
                type="button"
                onClick={() => onSelect(fav)}
                className="w-full rounded-control border border-border bg-bg p-3 text-right transition-colors hover:border-primary-200 hover:bg-primary-50/50"
              >
                <div className="mb-1 flex items-center gap-2">
                  {fav.mealType && <Pill>{MEAL_TYPE_LABELS[fav.mealType]}</Pill>}
                  <span className="font-semibold text-ink-800">{fav.name}</span>
                </div>
                <p className="text-caption text-ink-500">{fav.items.map((i) => i.foodName).join(', ')}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
