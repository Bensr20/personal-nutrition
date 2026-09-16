import { useRef, useState, type FormEvent } from 'react'
import type { FavoriteMeal, Meal, MealInput, MealItemInput, MealType } from '@/types/domain'
import { MEAL_TYPE_LABELS, MEAL_TYPES } from '@/types/domain'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { FormActions } from '@/components/ui/FormActions'
import { MealItemsEditor } from './MealItemsEditor'
import { FavoritesPickerModal } from './FavoritesPickerModal'
import { MealPhoto } from './MealPhoto'
import { nowTimeKey } from '@/lib/dateUtils'
import { Star, AlertCircle, Camera } from '@/components/ui/icons'
import { mealsService } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

interface Props {
  initialDate: string
  initialMealType?: MealType
  meal?: Meal
  onSubmit: (input: MealInput) => Promise<Meal>
  onCancel: () => void
  onSuccess: () => void
  submitLabel?: string
}

export function MealForm({ initialDate, initialMealType, meal, onSubmit, onCancel, onSuccess, submitLabel = 'שמירה' }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [mealDate, setMealDate] = useState(meal?.mealDate ?? initialDate)
  const [mealTime, setMealTime] = useState(meal?.mealTime ?? nowTimeKey())
  const [mealType, setMealType] = useState<MealType>(meal?.mealType ?? initialMealType ?? 'breakfast')
  const [note, setNote] = useState(meal?.note ?? '')
  const [items, setItems] = useState<MealItemInput[]>(
    meal?.items.map((i) => ({
      foodName: i.foodName,
      quantity: i.quantity,
      unit: i.unit,
      foodRef: i.foodRef,
      unitCode: i.unitCode,
      amountGrams: i.amountGrams,
      nutrition: i.nutrition,
    })) ?? [{ foodName: '', quantity: 1, unit: 'יחידה' }],
  )
  const [error, setError] = useState<string | null>(null)
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null)
  const [currentPhotoPath, setCurrentPhotoPath] = useState<string | null>(meal?.photoPath ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const submitting = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function applyFavorite(fav: FavoriteMeal) {
    setItems(fav.items.map((it) => ({ ...it })))
    if (fav.mealType) setMealType(fav.mealType)
    if (fav.note) setNote(fav.note)
    setFavoritesOpen(false)
  }

  function handlePhotoSelect(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('נא לבחור קובץ תמונה', 'error')
      return
    }
    setPendingPhotoFile(file)
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting.current) return

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
      const savedMeal = await onSubmit({
        mealDate,
        mealTime: mealTime || null,
        mealType,
        note: note.trim() || null,
        items: cleanItems,
      })
      if (pendingPhotoFile && user) {
        try {
          const updated = await mealsService.attachPhoto(user.id, savedMeal.id, pendingPhotoFile)
          setCurrentPhotoPath(updated.photoPath)
        } catch (photoErr) {
          showToast(photoErr instanceof Error ? photoErr.message : 'צירוף התמונה נכשל', 'error')
        }
      }
      onSuccess()
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
        <div className="flex items-center gap-4">
          {photoPreview ? (
            <img src={photoPreview} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
          ) : (
            <MealPhoto photoPath={currentPhotoPath} mealType={mealType} size="sm" />
          )}
          <div className="flex flex-col gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
            />
            <Button type="button" variant="secondary" size="md" onClick={() => fileInputRef.current?.click()}>
              <Camera className="h-4 w-4" aria-hidden />
              {photoPreview || currentPhotoPath ? 'החלפת תמונה' : 'הוספת תמונה'}
            </Button>
            <span className="text-caption text-ink-600">אופציונלי — צילום של הארוחה בלבד</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input id="mealDate" type="date" label="תאריך" required value={mealDate} onChange={(e) => setMealDate(e.target.value)} />
          <Input id="mealTime" type="time" label="שעה" value={mealTime} onChange={(e) => setMealTime(e.target.value)} />
        </div>

        <Select id="mealType" label="סוג ארוחה" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
          {MEAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {MEAL_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>

        <MealItemsEditor
          items={items}
          onChange={setItems}
          headerAction={
            <button
              type="button"
              onClick={() => setFavoritesOpen(true)}
              className="flex items-center gap-1 text-caption font-semibold text-primary-600 transition-colors hover:text-primary-700"
            >
              <Star className="h-3.5 w-3.5" aria-hidden />
              בחירה ממועדפים
            </button>
          }
        />

        <Textarea id="note" label="הערה" hint="אופציונלי" value={note} onChange={(e) => setNote(e.target.value)} />

        <FavoritesPickerModal open={favoritesOpen} onClose={() => setFavoritesOpen(false)} onSelect={applyFavorite} />

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
          {submitLabel}
        </Button>
      </FormActions>
    </form>
  )
}
