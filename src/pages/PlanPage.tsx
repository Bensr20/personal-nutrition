import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner, EmptyState, Pill } from '@/components/ui/Misc'
import { Modal } from '@/components/ui/Modal'
import { PlannedMealForm } from '@/components/plan/PlannedMealForm'
import { MoveToJournalModal } from '@/components/plan/MoveToJournalModal'
import { CopyDayModal } from '@/components/plan/CopyDayModal'
import { planService } from '@/services'
import { DAY_NAMES, MEAL_TYPE_LABELS } from '@/types/domain'
import type { MealPlan, PlannedMeal } from '@/types/domain'
import { dayOfWeek, todayKey } from '@/lib/dateUtils'
import { Plus, Pencil, Send, Trash2, CalendarDays, Copy } from '@/components/ui/icons'

export function PlanPage() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([])
  const [selectedDay, setSelectedDay] = useState(dayOfWeek(todayKey()))

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PlannedMeal | undefined>(undefined)
  const [movingMeal, setMovingMeal] = useState<PlannedMeal | null>(null)
  const [copyDayOpen, setCopyDayOpen] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const activePlan = await planService.getActivePlan(user.id)
      const items = await planService.listPlannedMeals(user.id, activePlan.id)
      setPlan(activePlan)
      setPlannedMeals(items)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'טעינת התוכנית נכשלה', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, showToast])

  useEffect(() => {
    load()
  }, [load])

  if (!user) return null

  const dayMeals = plannedMeals.filter((p) => p.dayOfWeek === selectedDay)

  return (
    <AppShell title="התוכנית שלי">
      <div className="mb-4 flex items-center justify-between animate-fade-in">
        <h2 className="text-title text-ink-900">{plan?.title ?? 'התוכנית שלי'}</h2>
        <Button size="md" variant="secondary" onClick={() => setCopyDayOpen(true)}>
          <Copy className="h-4 w-4" aria-hidden />
          העתקת יום
        </Button>
      </div>

      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        {DAY_NAMES.map((d, i) => (
          <button
            key={i}
            onClick={() => setSelectedDay(i)}
            className={[
              'flex h-11 shrink-0 items-center rounded-full px-4 text-body font-semibold transition-colors',
              selectedDay === i ? 'bg-primary-500 text-white' : 'bg-white text-ink-600 border border-ink-200 hover:bg-bg',
            ].join(' ')}
          >
            {d}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button
              size="md"
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              ארוחה מתוכננת
            </Button>
          </div>

          {dayMeals.length === 0 ? (
            <EmptyState icon={<CalendarDays className="h-5 w-5" aria-hidden />} title={`אין ארוחות מתוכננות ליום ${DAY_NAMES[selectedDay]}`} />
          ) : (
            dayMeals.map((pm) => (
              <Card key={pm.id} className="animate-fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Pill>{MEAL_TYPE_LABELS[pm.mealType]}</Pill>
                      <span className="font-semibold text-ink-800">{pm.name}</span>
                    </div>
                    <p className="text-caption text-ink-500">{pm.items.map((i) => `${i.foodName} (${i.quantity} ${i.unit})`).join(', ')}</p>
                    {pm.note && <p className="mt-1 text-caption text-ink-400">{pm.note}</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="md" variant="ghost" onClick={() => { setEditing(pm); setFormOpen(true) }}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    עריכה
                  </Button>
                  <Button size="md" variant="secondary" onClick={() => setMovingMeal(pm)}>
                    <Send className="h-4 w-4" aria-hidden />
                    ליומן
                  </Button>
                  <Button
                    size="md"
                    variant="danger"
                    onClick={async () => {
                      if (!user) return
                      await planService.deletePlannedMeal(user.id, pm.id)
                      showToast('נמחק מהתוכנית', 'success')
                      load()
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    מחיקה
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'עריכת ארוחה מתוכננת' : 'ארוחה מתוכננת חדשה'}>
        <PlannedMealForm
          initialDayOfWeek={selectedDay}
          plannedMeal={editing}
          onCancel={() => setFormOpen(false)}
          onSubmit={async (value) => {
            if (!user || !plan) return
            if (editing) {
              await planService.updatePlannedMeal(user.id, editing.id, value)
              showToast('הארוחה המתוכננת עודכנה', 'success')
            } else {
              await planService.createPlannedMeal(user.id, plan.id, value)
              showToast('הארוחה נוספה לתוכנית', 'success')
            }
            setFormOpen(false)
            load()
          }}
        />
      </Modal>

      <MoveToJournalModal plannedMeal={movingMeal} onClose={() => setMovingMeal(null)} onSaved={load} />
      <CopyDayModal open={copyDayOpen} planId={plan?.id ?? null} fromDay={selectedDay} onClose={() => setCopyDayOpen(false)} onSaved={load} />
    </AppShell>
  )
}
