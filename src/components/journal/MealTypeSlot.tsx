import type { Meal, MealType } from '@/types/domain'
import { MEAL_TYPE_LABELS } from '@/types/domain'
import { Button } from '@/components/ui/Button'
import { MealPhoto } from '@/components/meals/MealPhoto'
import { Plus, Clock, MoreHorizontal } from '@/components/ui/icons'

interface Props {
  mealType: MealType
  meals: Meal[]
  /** מיקום התמונה: true = תמונה בצד ה"התחלה" (ימין ב-RTL), משתנה לסירוגין בין שורות כמו ברפרנס */
  imageFirst: boolean
  onAdd: () => void
  onOpen: (meal: Meal) => void
  onMenu: (meal: Meal) => void
}

export function MealTypeSlot({ mealType, meals, imageFirst, onAdd, onOpen, onMenu }: Props) {
  const primary = meals[0]
  const extra = meals.length - 1
  const label = MEAL_TYPE_LABELS[mealType]

  const imageEl = (
    <button
      type="button"
      onClick={() => primary && onOpen(primary)}
      disabled={!primary}
      aria-label={`פתיחת פרטי ארוחת ${label}`}
      className="relative mx-1.5 h-[92px] w-[92px] shrink-0 self-center overflow-hidden rounded-[28px] shadow-soft disabled:cursor-default"
    >
      <MealPhoto photoPath={primary?.photoPath ?? null} mealType={mealType} size="lg" rounded="rounded-none" className="h-full w-full" />
    </button>
  )

  const textEl = (
    <div className="min-w-0 flex-1 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-subtitle text-ink-900">{label}</h3>
        {primary && (
          <button
            type="button"
            onClick={() => onMenu(primary)}
            aria-label="פעולות נוספות"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-bg hover:text-ink-900"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden />
          </button>
        )}
      </div>

      {primary ? (
        <>
          <p className="truncate text-caption text-ink-600">{primary.items.map((i) => i.foodName).join(', ')}</p>
          <div className="mt-1 flex items-center gap-2">
            {primary.mealTime && (
              <span className="flex items-center gap-1 text-micro text-ink-600">
                <Clock className="h-3 w-3" aria-hidden />
                {primary.mealTime}
              </span>
            )}
            {extra > 0 && <span className="text-micro font-semibold text-primary-600">+{extra} נוספות</span>}
          </div>
        </>
      ) : (
        <>
          <p className="mb-2 text-caption text-ink-600">לא נרשם עדיין</p>
          <Button size="md" onClick={onAdd} className="!h-11 !px-3.5 !text-caption">
            <Plus className="h-4 w-4" aria-hidden />
            הוספה
          </Button>
        </>
      )}
    </div>
  )

  return (
    <div className={`flex h-[110px] overflow-hidden rounded-card border border-border bg-white shadow-soft ${imageFirst ? 'flex-row' : 'flex-row-reverse'}`}>
      {imageEl}
      {textEl}
    </div>
  )
}
