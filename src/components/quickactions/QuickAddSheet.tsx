import { useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { FormActions } from '@/components/ui/FormActions'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { logsService } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

type Kind = 'water' | 'activity' | 'weight'

interface Props {
  open: boolean
  kind: Kind
  date: string
  onClose: () => void
  onSaved: () => void
}

const WATER_PRESETS = [100, 200, 250, 330, 500]
const ACTIVITY_TYPES = ['הליכה', 'ריצה', 'אופניים', 'שחייה', 'כוח', 'יוגה', 'אחר']

const KIND_TITLES: Record<Kind, string> = {
  water: 'הוספת שתייה',
  activity: 'רישום פעילות',
  weight: 'עדכון משקל',
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-11 rounded-full border px-4 text-body font-semibold transition-colors',
        active ? 'border-primary-500 bg-primary-500 text-white' : 'border-ink-200 text-ink-600 hover:bg-bg',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function QuickAddSheet({ open, kind, date, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const submitting = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [waterAmount, setWaterAmount] = useState(250)
  const [activityType, setActivityType] = useState(ACTIVITY_TYPES[0])
  const [activityMinutes, setActivityMinutes] = useState(30)
  const [weightKg, setWeightKg] = useState('')

  async function guardedSubmit(fn: () => Promise<void>) {
    if (submitting.current || !user) return
    submitting.current = true
    setIsSubmitting(true)
    try {
      await fn()
      onSaved()
      onClose()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'השמירה נכשלה, נסו שוב', 'error')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={KIND_TITLES[kind]}>
      {kind === 'water' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            {WATER_PRESETS.map((amt) => (
              <ChipButton key={amt} active={waterAmount === amt} onClick={() => setWaterAmount(amt)}>
                {amt} מ״ל
              </ChipButton>
            ))}
          </div>
          <div className="flex items-center justify-center py-2">
            <QuantityStepper value={waterAmount} onChange={setWaterAmount} step={50} min={0} max={5000} unitLabel="מ״ל" />
          </div>
        </div>
      )}

      {kind === 'activity' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_TYPES.map((t) => (
              <ChipButton key={t} active={activityType === t} onClick={() => setActivityType(t)}>
                {t}
              </ChipButton>
            ))}
          </div>
          <div className="flex flex-col items-center gap-2 py-2">
            <span className="text-caption font-semibold text-ink-700">משך בדקות</span>
            <QuantityStepper value={activityMinutes} onChange={setActivityMinutes} step={5} min={0} max={600} unitLabel="דק׳" />
          </div>
        </div>
      )}

      {kind === 'weight' && (
        <div className="flex flex-col gap-5">
          <Input
            id="weightKg"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="1"
            label="משקל (ק״ג)"
            autoFocus
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>
      )}

      <FormActions>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          ביטול
        </Button>
        {kind === 'water' && (
          <Button
            loading={isSubmitting}
            onClick={() =>
              guardedSubmit(async () => {
                if (waterAmount <= 0) throw new Error('נא לבחור כמות גדולה מאפס')
                await logsService.addWater(user!.id, date, waterAmount)
                showToast('השתייה נוספה', 'success')
              })
            }
          >
            הוספה
          </Button>
        )}
        {kind === 'activity' && (
          <Button
            loading={isSubmitting}
            onClick={() =>
              guardedSubmit(async () => {
                if (activityMinutes <= 0) throw new Error('משך הפעילות חייב להיות גדול מאפס')
                await logsService.addActivity(user!.id, date, activityType, activityMinutes, null)
                showToast('הפעילות נרשמה', 'success')
              })
            }
          >
            רישום פעילות
          </Button>
        )}
        {kind === 'weight' && (
          <Button
            loading={isSubmitting}
            onClick={() =>
              guardedSubmit(async () => {
                const val = Number(weightKg)
                if (!(val > 0)) throw new Error('נא להזין משקל תקין')
                await logsService.upsertWeight(user!.id, date, val, null)
                showToast('המשקל עודכן', 'success')
              })
            }
          >
            שמירה
          </Button>
        )}
      </FormActions>
    </Modal>
  )
}
