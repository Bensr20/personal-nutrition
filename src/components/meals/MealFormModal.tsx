import type { Meal, MealInput, MealType } from '@/types/domain'
import { Modal } from '@/components/ui/Modal'
import { MealForm } from './MealForm'
import { mealsService } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

interface Props {
  open: boolean
  date: string
  mealType?: MealType
  meal?: Meal
  onClose: () => void
  onSaved: () => void
}

export function MealFormModal({ open, date, mealType, meal, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()

  async function handleSubmit(input: MealInput): Promise<Meal> {
    if (!user) throw new Error('יש להתחבר מחדש')
    const saved = meal ? await mealsService.updateMeal(user.id, meal.id, input) : await mealsService.createMeal(user.id, input)
    showToast(meal ? 'הארוחה עודכנה' : 'הארוחה נוספה', 'success')
    return saved
  }

  return (
    <Modal open={open} onClose={onClose} title={meal ? 'עריכת ארוחה' : 'הוספת ארוחה'}>
      <MealForm
        initialDate={date}
        initialMealType={mealType}
        meal={meal}
        onSubmit={handleSubmit}
        onCancel={onClose}
        onSuccess={() => {
          onSaved()
          onClose()
        }}
      />
    </Modal>
  )
}
