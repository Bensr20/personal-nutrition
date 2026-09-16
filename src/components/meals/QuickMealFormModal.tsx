import { useRef, useState, type FormEvent } from 'react'
import type { MealItemInput, MealType } from '@/types/domain'
import { MEAL_TYPE_LABELS, MEAL_TYPES } from '@/types/domain'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { FormActions } from '@/components/ui/FormActions'
import { AlertCircle } from '@/components/ui/icons'
import { MealItemsEditor } from './MealItemsEditor'
import { favoritesService } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

// יצירת "ארוחה מהירה" חדשה מאפס (לא מארוחה קיימת ביומן) — נשמרת ברשומת favorite_meals
// הקיימת, ומופיעה בטאב "ארוחות מהירות" להוספה בלחיצה אחת ליומן היום.
export function QuickMealFormModal({ open, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [items, setItems] = useState<MealItemInput[]>([{ foodName: '', quantity: 1, unit: 'יחידה' }])
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function reset() {
    setName('')
    setMealType('breakfast')
    setItems([{ foodName: '', quantity: 1, unit: 'יחידה' }])
    setNote('')
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting.current || !user) return

    if (!name.trim()) {
      setError('נא להזין שם לארוחה')
      return
    }
    const cleanItems = items.filter((it) => it.foodName.trim().length > 0)
    if (cleanItems.length === 0) {
      setError('נא להוסיף לפחות פריט מזון אחד עם שם')
      return
    }
    if (cleanItems.some((it) => !(it.quantity > 0))) {
      setError('הכמות חייבת להיות גדולה מאפס')
      return
    }

    setError(null)
    submitting.current = true
    setIsSubmitting(true)
    try {
      await favoritesService.createFavorite(user.id, {
        name: name.trim(),
        mealType,
        items: cleanItems,
        note: note.trim() || null,
      })
      showToast('הארוחה המהירה נשמרה', 'success')
      reset()
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה, נסו שוב')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="ארוחה מהירה חדשה">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="flex flex-col gap-4">
          <Input id="quickMealName" label="שם הארוחה" required placeholder='למשל: "טורטייה עם מקושקשת"' value={name} onChange={(e) => setName(e.target.value)} />

          <Select id="quickMealType" label="סוג ארוחה" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
            {MEAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {MEAL_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>

          <MealItemsEditor items={items} onChange={setItems} />

          <Textarea id="quickMealNote" label="הערה" hint="אופציונלי" value={note} onChange={(e) => setNote(e.target.value)} />

          {error && (
            <p className="flex items-center gap-1.5 text-caption font-medium text-coral-600" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
        </div>

        <FormActions>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            ביטול
          </Button>
          <Button type="submit" loading={isSubmitting}>
            שמירה
          </Button>
        </FormActions>
      </form>
    </Modal>
  )
}
