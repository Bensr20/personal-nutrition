import { useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { FormActions } from '@/components/ui/FormActions'
import { planService } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import type { PlannedMeal } from '@/types/domain'
import { todayKey } from '@/lib/dateUtils'

interface Props {
  plannedMeal: PlannedMeal | null
  onClose: () => void
  onSaved: () => void
}

export function MoveToJournalModal({ plannedMeal, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [targetDate, setTargetDate] = useState(todayKey())
  const submitting = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (submitting.current || !user || !plannedMeal) return
    submitting.current = true
    setIsSubmitting(true)
    try {
      await planService.moveToJournal(user.id, plannedMeal, targetDate)
      showToast('הארוחה נוספה ליומן', 'success')
      onSaved()
      onClose()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'הפעולה נכשלה, נסו שוב', 'error')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={!!plannedMeal} onClose={onClose} title="העברה ליומן">
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-600">הארוחה &quot;{plannedMeal?.name}&quot; תתווסף ליומן בתאריך שתבחרו.</p>
        <Input id="moveTargetDate" type="date" label="תאריך" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>
      <FormActions>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          ביטול
        </Button>
        <Button onClick={handleSubmit} loading={isSubmitting}>
          הוספה ליומן
        </Button>
      </FormActions>
    </Modal>
  )
}
