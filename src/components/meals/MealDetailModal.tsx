import type { Meal } from '@/types/domain'
import { MEAL_TYPE_LABELS } from '@/types/domain'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormActions } from '@/components/ui/FormActions'
import { MealPhoto } from './MealPhoto'
import { Pill } from '@/components/ui/Misc'
import { Clock, Pencil, Flame } from '@/components/ui/icons'
import { computeMealTotals, roundForDisplay } from '@/lib/nutritionCalc'

interface Props {
  meal: Meal | null
  onClose: () => void
  onEdit: (meal: Meal) => void
}

// מסך פרטי ארוחה: תמונה מרכזית (כשקיימת), שם/סוג, פריטים והערה. ערכים תזונתיים
// מוצגים רק לפריטים עם צילום מצב שמור (item.nutrition) — פריט טקסט חופשי יישאר בלי קלוריות.
export function MealDetailModal({ meal, onClose, onEdit }: Props) {
  if (!meal) return null

  const totals = computeMealTotals(meal.items)

  return (
    <Modal open={!!meal} onClose={onClose} title={MEAL_TYPE_LABELS[meal.mealType]}>
      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          <MealPhoto photoPath={meal.photoPath} mealType={meal.mealType} size="lg" className="h-48 w-full" rounded="rounded-3xl" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill>{MEAL_TYPE_LABELS[meal.mealType]}</Pill>
          {meal.mealTime && (
            <span className="flex items-center gap-1 text-caption text-ink-500">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {meal.mealTime}
            </span>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-subtitle text-ink-900">פריטים</h4>
          <ul className="flex flex-col gap-2">
            {meal.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5 rounded-control bg-bg px-3.5 py-2.5 text-body text-ink-800">
                <div className="flex items-center justify-between">
                  <span>{item.foodName}</span>
                  <span className="text-caption text-ink-500 tabular-nums">
                    {item.quantity} {item.unit}
                  </span>
                </div>
                {item.nutrition && (
                  <span className="flex items-center gap-1 text-caption text-ink-500 tabular-nums">
                    <Flame className="h-3.5 w-3.5" aria-hidden />
                    {item.nutrition.kcal != null ? `${roundForDisplay(item.nutrition.kcal)} קק״ל` : 'אין נתון קלוריות'}
                    {item.nutrition.isPartial && ' · חלקי'}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {totals.hasAnyNutrition && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-control bg-primary-50 px-3.5 py-2.5 text-caption font-semibold text-ink-800 tabular-nums">
              <span className="flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-primary-600" aria-hidden />
                סה״כ {roundForDisplay(totals.kcal)} קק״ל{totals.isPartial && ' (חלקי)'}
              </span>
              <span className="font-normal text-ink-600">חלבון {roundForDisplay(totals.proteinG)} ג׳</span>
              <span className="font-normal text-ink-600">פחמימות {roundForDisplay(totals.carbsG)} ג׳</span>
              <span className="font-normal text-ink-600">שומן {roundForDisplay(totals.fatG)} ג׳</span>
            </div>
          )}
        </div>

        {meal.note && (
          <div>
            <h4 className="mb-1 text-subtitle text-ink-900">הערה</h4>
            <p className="text-body text-ink-600">{meal.note}</p>
          </div>
        )}
      </div>

      <FormActions>
        <Button variant="ghost" onClick={onClose}>
          סגירה
        </Button>
        <Button onClick={() => onEdit(meal)}>
          <Pencil className="h-4 w-4" aria-hidden />
          עריכה
        </Button>
      </FormActions>
    </Modal>
  )
}
