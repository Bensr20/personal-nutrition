import { useRef, useState, type FormEvent } from 'react'
import type { MealItemInput, MealType, PlannedMeal } from '@/types/domain'
import { MEAL_TYPE_LABELS, MEAL_TYPES, DAY_NAMES } from '@/types/domain'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { FormActions } from '@/components/ui/FormActions'
import { MealItemsEditor } from '@/components/meals/MealItemsEditor'
import { AlertCircle } from '@/components/ui/icons'

export interface PlannedMealFormValue {
  name: string
  dayOfWeek: number
  mealType: MealType
  items: MealItemInput[]
  note: string | null
}

interface Props {
  initialDayOfWeek: number
  initialMealType?: MealType
  plannedMeal?: PlannedMeal
  onSubmit: (value: PlannedMealFormValue) => Promise<void>
  onCancel: () => void
}

export function PlannedMealForm({ initialDayOfWeek, initialMealType, plannedMeal, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(plannedMeal?.name ?? '')
  const [dayOfWeek, setDayOfWeek] = useState(plannedMeal?.dayOfWeek ?? initialDayOfWeek)
  const [mealType, setMealType] = useState<MealType>(plannedMeal?.mealType ?? initialMealType ?? 'breakfast')
  const [items, setItems] = useState<MealItemInput[]>(plannedMeal?.items ?? [{ foodName: '', quantity: 1, unit: 'יחידה' }])
  const [note, setNote] = useState(plannedMeal?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting.current) return
    if (!name.trim()) {
      setError('נא להזין שם לארוחה')
      return
    }
    const cleanItems = items.filter((it) => it.foodName.trim().length > 0)

    setError(null)
    submitting.current = true
    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), dayOfWeek, mealType, items: cleanItems, note: note.trim() || null })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה, נסו שוב')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="flex flex-col gap-4">
        <Input id="planName" label="שם הארוחה" required value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select id="planDay" label="יום" value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
            {DAY_NAMES.map((d, i) => (
              <option key={i} value={i}>
                יום {d}
              </option>
            ))}
          </Select>
          <Select id="planMealType" label="סוג ארוחה" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
            {MEAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {MEAL_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <MealItemsEditor items={items} onChange={setItems} />
        <Textarea id="planNote" label="הערה" hint="אופציונלי" value={note} onChange={(e) => setNote(e.target.value)} />
        {error && (
          <p className="flex items-center gap-1.5 text-caption font-medium text-coral-600" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          ביטול
        </Button>
        <Button type="submit" loading={isSubmitting}>
          שמירה
        </Button>
      </FormActions>
    </form>
  )
}
