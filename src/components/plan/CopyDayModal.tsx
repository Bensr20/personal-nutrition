import { useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { FormActions } from '@/components/ui/FormActions'
import { planService } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { DAY_NAMES } from '@/types/domain'

interface Props {
  open: boolean
  planId: string | null
  fromDay: number
  onClose: () => void
  onSaved: () => void
}

export function CopyDayModal({ open, planId, fromDay, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [toDay, setToDay] = useState((fromDay + 1) % 7)
  const submitting = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (submitting.current || !user || !planId) return
    submitting.current = true
    setIsSubmitting(true)
    try {
      await planService.copyDay(user.id, planId, fromDay, toDay)
      showToast('התכנון הועתק', 'success')
      onSaved()
      onClose()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ההעתקה נכשלה, נסו שוב', 'error')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`העתקת תכנון יום ${DAY_NAMES[fromDay]}`}>
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-600">הארוחות המתוכננות ביום {DAY_NAMES[fromDay]} יעתיקו את היום היעד ויחליפו את התכנון שלו.</p>
        <Select id="toDay" label="ליום" value={toDay} onChange={(e) => setToDay(Number(e.target.value))}>
          {DAY_NAMES.map((d, i) =>
            i === fromDay ? null : (
              <option key={i} value={i}>
                יום {d}
              </option>
            ),
          )}
        </Select>
      </div>
      <FormActions>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          ביטול
        </Button>
        <Button onClick={handleSubmit} loading={isSubmitting}>
          העתקה
        </Button>
      </FormActions>
    </Modal>
  )
}
