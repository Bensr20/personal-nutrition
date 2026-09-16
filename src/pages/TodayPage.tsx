import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner, EmptyState, Pill } from '@/components/ui/Misc'
import { RingStat } from '@/components/ui/RingStat'
import { WaterGlassRow } from '@/components/ui/WaterGlassRow'
import { MealFormModal } from '@/components/meals/MealFormModal'
import { MealPhoto } from '@/components/meals/MealPhoto'
import { QuickAddSheet } from '@/components/quickactions/QuickAddSheet'
import { mealsService, logsService, planService } from '@/services'
import { todayKey, dayOfWeek, formatDateLong, formatWeekday } from '@/lib/dateUtils'
import { MEAL_TYPE_LABELS, MEAL_TYPES } from '@/types/domain'
import type { Meal, PlannedMeal, WaterLog, ActivityLog, WeightLog } from '@/types/domain'
import { Plus, Check, Droplet, Footprints, Scale, UtensilsCrossed, Clock } from '@/components/ui/icons'

const ML_PER_GLASS = 250

function formatWater(ml: number): string {
  if (ml < 1000) return `${ml} מ״ל`
  const liters = (ml / 1000).toFixed(2).replace(/\.?0+$/, '')
  return `${liters} ל׳`
}

export function TodayPage() {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const date = todayKey()

  const [loading, setLoading] = useState(true)
  const [meals, setMeals] = useState<Meal[]>([])
  const [plannedToday, setPlannedToday] = useState<PlannedMeal[]>([])
  const [water, setWater] = useState<WaterLog[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const [mealModalOpen, setMealModalOpen] = useState(false)
  const [quickAddKind, setQuickAddKind] = useState<'water' | 'activity' | 'weight' | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const plan = await planService.getActivePlan(user.id)
      const [mealsToday, planned, waterToday, activityToday, weight] = await Promise.all([
        mealsService.listMealsForDate(user.id, date),
        planService.listPlannedMeals(user.id, plan.id),
        logsService.listWaterForDate(user.id, date),
        logsService.listActivityForDate(user.id, date),
        logsService.getLatestWeight(user.id),
      ])
      setMeals(mealsToday)
      setPlannedToday(planned.filter((p) => p.dayOfWeek === dayOfWeek(date)))
      setWater(waterToday)
      setActivity(activityToday)
      setLatestWeight(weight)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'טעינת הנתונים נכשלה', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, date, showToast])

  useEffect(() => {
    load()
  }, [load])

  if (!user) return null

  const totalWaterMl = water.reduce((sum, w) => sum + w.amountMl, 0)
  const totalActivityMin = activity.reduce((sum, a) => sum + a.durationMinutes, 0)
  const loggedPlannedIds = new Set(meals.map((m) => m.sourcePlannedMealId).filter(Boolean))
  const remainingPlanned = [...plannedToday.filter((p) => !loggedPlannedIds.has(p.id))].sort(
    (a, b) => MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType),
  )
  const [heroMeal, ...otherPlanned] = remainingPlanned
  const loggedMeals = [...meals].sort((a, b) => (a.mealTime ?? '99:99').localeCompare(b.mealTime ?? '99:99'))
  const hasNothingToday = loggedMeals.length === 0 && remainingPlanned.length === 0

  const waterGoal = profile?.waterGoalMl && profile.waterGoalMl > 0 ? profile.waterGoalMl : null
  const waterProgress = waterGoal ? Math.min(1, totalWaterMl / waterGoal) : 0
  const totalGlasses = waterGoal ? Math.max(1, Math.round(waterGoal / ML_PER_GLASS)) : 0
  const filledGlasses = waterGoal ? Math.min(totalGlasses, Math.round(totalWaterMl / ML_PER_GLASS)) : 0

  const activityGoal = profile?.activityGoalMinutes && profile.activityGoalMinutes > 0 ? profile.activityGoalMinutes : null

  async function markPlannedAsEaten(planned: PlannedMeal) {
    if (!user || markingId) return
    setMarkingId(planned.id)
    try {
      await planService.moveToJournal(user.id, planned, date)
      showToast('סומן כנאכל ונוסף ליומן', 'success')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'הפעולה נכשלה', 'error')
    } finally {
      setMarkingId(null)
    }
  }

  return (
    <AppShell title="היום שלי">
      <div className="mb-6 animate-fade-in">
        <p className="text-caption text-ink-500">{formatWeekday(date)}, {formatDateLong(date)}</p>
        <h2 className="text-display text-ink-900">{profile?.displayName ? `שלום, ${profile.displayName}` : 'שלום!'}</h2>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-5">
          {heroMeal && (
            <Card className="animate-fade-in border-primary-100 bg-primary-50/50 p-5">
              <div className="flex items-start gap-3.5">
                <MealPhoto photoPath={null} mealType={heroMeal.mealType} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-micro uppercase text-primary-600">הארוחה הבאה שלך</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <h3 className="text-subtitle text-ink-900">{heroMeal.name}</h3>
                    <Pill>{MEAL_TYPE_LABELS[heroMeal.mealType]}</Pill>
                  </div>
                  {heroMeal.items.length > 0 && (
                    <p className="mt-1 truncate text-caption text-ink-500">{heroMeal.items.map((i) => i.foodName).join(', ')}</p>
                  )}
                </div>
              </div>
              <Button
                size="md"
                onClick={() => markPlannedAsEaten(heroMeal)}
                loading={markingId === heroMeal.id}
                className="mt-4 w-full sm:w-auto"
              >
                <Check className="h-4 w-4" aria-hidden />
                סימון כאכלתי
              </Button>
            </Card>
          )}

          <Button size="lg" onClick={() => setMealModalOpen(true)} className="w-full">
            <Plus className="h-5 w-5" aria-hidden />
            הוספת ארוחה
          </Button>

          <Card className="animate-fade-in p-5">
            <button type="button" onClick={() => setQuickAddKind('water')} className="flex w-full items-start justify-between gap-3 text-right">
              <div>
                <p className="text-caption font-semibold text-ink-500">שתייה היום</p>
                <p className="mt-1 text-title text-ink-900 tabular-nums">
                  {formatWater(totalWaterMl)}
                  {waterGoal && <span className="text-caption font-normal text-ink-400"> / {formatWater(waterGoal)}</span>}
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                <Droplet className="h-5 w-5" aria-hidden />
              </span>
            </button>

            {waterGoal ? (
              <>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-200">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all duration-500"
                    style={{ width: `${waterProgress * 100}%` }}
                  />
                </div>
                <div className="mt-4">
                  <WaterGlassRow totalGlasses={totalGlasses} filledGlasses={filledGlasses} />
                </div>
              </>
            ) : (
              <p className="mt-2 text-caption text-ink-400">הגדירו יעד שתייה יומי בהגדרות כדי לראות כאן התקדמות</p>
            )}
          </Card>

          <Card className="grid grid-cols-3 divide-x divide-x-reverse divide-border p-0">
            <button
              type="button"
              onClick={() => setQuickAddKind('activity')}
              className="flex flex-col items-center gap-1.5 px-2 py-4 text-center transition-colors hover:bg-bg"
            >
              {activityGoal ? (
                <RingStat value={totalActivityMin} max={activityGoal} size={44} strokeWidth={5} colorClassName="text-orange-500" />
              ) : (
                <Footprints className="h-[22px] w-[22px] text-orange-500" aria-hidden />
              )}
              <span className="text-subtitle text-ink-900 tabular-nums">{totalActivityMin} דק׳</span>
              <span className="text-micro text-ink-500">{activityGoal ? `מתוך ${activityGoal}` : 'פעילות'}</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickAddKind('weight')}
              className="flex flex-col items-center gap-1.5 px-2 py-4 text-center transition-colors hover:bg-bg"
            >
              <Scale className="h-[22px] w-[22px] text-primary-500" aria-hidden />
              <span className="text-subtitle text-ink-900 tabular-nums">{latestWeight ? `${latestWeight.weightKg} ק״ג` : '—'}</span>
              <span className="text-micro text-ink-500">{latestWeight ? formatDateLong(latestWeight.logDate) : 'אין מדידה'}</span>
            </button>
            <div className="flex flex-col items-center gap-1.5 px-2 py-4 text-center">
              <UtensilsCrossed className="h-[22px] w-[22px] text-mint-500" aria-hidden />
              <span className="text-subtitle text-ink-900 tabular-nums">{loggedMeals.length}</span>
              <span className="text-micro text-ink-500">ארוחות נרשמו</span>
            </div>
          </Card>

          {hasNothingToday ? (
            <EmptyState
              icon={<UtensilsCrossed className="h-5 w-5" aria-hidden />}
              title="עדיין לא תיעדתם ארוחה היום"
              description="הוסיפו את הארוחה הראשונה שלכם, או פתחו את התוכנית השבועית כדי לתכנן קדימה."
              action={
                <Button size="md" onClick={() => setMealModalOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  הוספת ארוחה
                </Button>
              }
            />
          ) : (
            (loggedMeals.length > 0 || otherPlanned.length > 0) && (
              <section>
                <h3 className="mb-3 text-subtitle text-ink-900">רצף הארוחות היום</h3>
                <Card className="divide-y divide-border p-0">
                  {loggedMeals.map((meal) => (
                    <div key={meal.id} className="flex items-center gap-3 px-4 py-3.5 first:pt-4 last:pb-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint-100 text-mint-600">
                        <Check className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-body font-semibold text-ink-900">{MEAL_TYPE_LABELS[meal.mealType]}</span>
                          {meal.mealTime && (
                            <span className="flex items-center gap-1 text-caption text-ink-500">
                              <Clock className="h-3 w-3" aria-hidden />
                              {meal.mealTime}
                            </span>
                          )}
                        </div>
                        {meal.items.length > 0 && (
                          <p className="truncate text-caption text-ink-500">{meal.items.map((i) => i.foodName).join(', ')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {otherPlanned.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3.5 first:pt-4 last:pb-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-ink-200 text-ink-400">
                        <Clock className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-body font-semibold text-ink-700">{p.name}</span>
                          <Pill tone="neutral">{MEAL_TYPE_LABELS[p.mealType]}</Pill>
                        </div>
                        <p className="text-caption text-ink-500">מתוכנן, טרם נרשם</p>
                      </div>
                      <Button size="md" variant="secondary" loading={markingId === p.id} onClick={() => markPlannedAsEaten(p)}>
                        אכלתי
                      </Button>
                    </div>
                  ))}
                </Card>
              </section>
            )
          )}
        </div>
      )}

      <MealFormModal open={mealModalOpen} date={date} onClose={() => setMealModalOpen(false)} onSaved={load} />
      <QuickAddSheet
        open={quickAddKind !== null}
        kind={quickAddKind ?? 'water'}
        date={date}
        onClose={() => setQuickAddKind(null)}
        onSaved={load}
      />
    </AppShell>
  )
}
