import { useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { FormActions } from '@/components/ui/FormActions'
import { mealsService } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import type { Meal } from '@/types/domain'
import { addDays, todayKey } from '@/lib/dateUtils'

interface Props {
  meal: Meal | null
  onClose: () => void
  onSaved: () => void
}

export function DuplicateMealModal({ meal, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [targetDate, setTargetDate] = useState(addDays(todayKey(), 1))
  const submitting = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (submitting.current || !user || !meal) return
    submitting.current = true
    setIsSubmitting(true)
    try {
      await mealsService.duplicateMealToDate(user.id, meal.id, targetDate)
      showToast('הארוחה שוכפלה', 'success')
      onSaved()
      onClose()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'השכפול נכשל, נסו שוב', 'error')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={!!meal} onClose={onClose} title="שכפול ארוחה ליום אחר">
      <div className="flex flex-col gap-4">
        <Input id="targetDate" type="date" label="ליום" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>
      <FormActions>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          ביטול
        </Button>
        <Button onClick={handleSubmit} loading={isSubmitting}>
          שכפול
        </Button>
      </FormActions>
    </Modal>
  )
}
