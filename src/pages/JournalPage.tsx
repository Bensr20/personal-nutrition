import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Misc'
import { WeekDayPicker } from '@/components/journal/WeekDayPicker'
import { MealTypeSlot } from '@/components/journal/MealTypeSlot'
import { MealFormModal } from '@/components/meals/MealFormModal'
import { MealDetailModal } from '@/components/meals/MealDetailModal'
import { MealActionsModal } from '@/components/meals/MealActionsModal'
import { DuplicateMealModal } from '@/components/meals/DuplicateMealModal'
import { QuickAddSheet } from '@/components/quickactions/QuickAddSheet'
import { mealsService, logsService, favoritesService } from '@/services'
import { todayKey, addDays, formatDateShort, formatWeekday, startOfWeek, isToday } from '@/lib/dateUtils'
import { computeDayTotals, roundForDisplay } from '@/lib/nutritionCalc'
import type { Meal, MealType, WaterLog, ActivityLog } from '@/types/domain'
import { ChevronRight, ChevronLeft, Plus, X, Droplet, Footprints, Flame, Loader2 } from '@/components/ui/icons'

// סדר הכרטיסים במסך היומן (כמו ברפרנס): בוקר, צהריים, ביניים, ערב — שונה מהסדר
// הכרונולוגי הרגיל (MEAL_TYPES) שמשמש במקומות אחרים באפליקציה (למשל בחירת סוג ארוחה בטופס).
const JOURNAL_MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner']

export function JournalPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const prefersReducedMotion = useReducedMotion()

  const [date, setDate] = useState(todayKey())
  const [loading, setLoading] = useState(true)
  const [meals, setMeals] = useState<Meal[]>([])
  const [daysWithData, setDaysWithData] = useState<Set<string>>(new Set())
  const [water, setWater] = useState<WaterLog[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])

  const [addMealType, setAddMealType] = useState<MealType | undefined>(undefined)
  const [mealModalOpen, setMealModalOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<Meal | undefined>(undefined)
  const [viewingMeal, setViewingMeal] = useState<Meal | null>(null)
  const [actionsMeal, setActionsMeal] = useState<Meal | null>(null)
  const [duplicateMeal, setDuplicateMeal] = useState<Meal | null>(null)
  const [quickAddKind, setQuickAddKind] = useState<'water' | 'activity' | 'weight' | null>(null)

  const weekStart = startOfWeek(date)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const weekEnd = addDays(weekStart, 6)
      const [mealsForDate, weekMeals, waterForDate, activityForDate] = await Promise.all([
        mealsService.listMealsForDate(user.id, date),
        mealsService.listMealsInRange(user.id, weekStart, weekEnd),
        logsService.listWaterForDate(user.id, date),
        logsService.listActivityForDate(user.id, date),
      ])
      setMeals(mealsForDate)
      setDaysWithData(new Set(weekMeals.map((m) => m.mealDate)))
      setWater(waterForDate)
      setActivity(activityForDate)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'טעינת הנתונים נכשלה', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, date, weekStart, showToast])

  useEffect(() => {
    load()
  }, [load])

  if (!user) return null

  function openAdd(type: MealType) {
    setEditingMeal(undefined)
    setAddMealType(type)
    setMealModalOpen(true)
  }

  // מחיקה אופטימית עם Undo: מסירים מהתצוגה מיד, ואם המחיקה בשרת נכשלת — משחזרים
  // את הרישום לרשימה המקומית (rollback) ומציגים שגיאה, במקום להשאיר תצוגה שקרית.
  async function handleDeleteWater(w: WaterLog) {
    if (!user) return
    setWater((cur) => cur.filter((x) => x.id !== w.id))
    try {
      await logsService.deleteWater(user.id, w.id)
      showToast('רישום השתייה נמחק', 'success', {
        label: 'ביטול',
        onClick: async () => {
          try {
            await logsService.addWater(user.id, w.logDate, w.amountMl)
            load()
          } catch {
            showToast('שחזור הרישום נכשל', 'error')
          }
        },
      })
    } catch (err) {
      setWater((cur) => [...cur, w].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)))
      showToast(err instanceof Error ? err.message : 'מחיקת רישום השתייה נכשלה', 'error')
    }
  }

  async function handleDeleteActivity(a: ActivityLog) {
    if (!user) return
    setActivity((cur) => cur.filter((x) => x.id !== a.id))
    try {
      await logsService.deleteActivity(user.id, a.id)
      showToast('רישום הפעילות נמחק', 'success', {
        label: 'ביטול',
        onClick: async () => {
          try {
            await logsService.addActivity(user.id, a.logDate, a.activityType, a.durationMinutes, a.note)
            load()
          } catch {
            showToast('שחזור הרישום נכשל', 'error')
          }
        },
      })
    } catch (err) {
      setActivity((cur) => [...cur, a].sort((x, y) => x.loggedAt.localeCompare(y.loggedAt)))
      showToast(err instanceof Error ? err.message : 'מחיקת רישום הפעילות נכשלה', 'error')
    }
  }

  const dayTotals = computeDayTotals(meals.map((m) => m.items))

  return (
    <AppShell title="יומן">
      <div className="mb-4 flex items-center justify-between animate-fade-in">
        <button
          onClick={() => setDate((d) => addDays(d, -7))}
          aria-label="שבוע קודם"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-bg-soft"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
        <button onClick={() => setDate(todayKey())} className="flex items-center gap-2 text-center">
          <p className="text-subtitle">
            <span className="text-primary-600">{isToday(date) ? 'היום' : formatWeekday(date)}</span>
            <span className="text-ink-900">{`, ${formatDateShort(date)}`}</span>
          </p>
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary-500" aria-hidden />}
          <span className="sr-only" role="status">
            {loading ? 'טוען נתונים…' : ''}
          </span>
        </button>
        <button
          onClick={() => setDate((d) => addDays(d, 7))}
          aria-label="שבוע הבא"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-bg-soft"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="mb-6 animate-fade-in">
        <WeekDayPicker weekStart={weekStart} selectedDate={date} daysWithData={daysWithData} onSelect={setDate} />
      </div>

      {/* התוכן לא נעלם לטובת spinner בכל החלפת יום — נשאר גלוי (גם אם עדיין שייך ליום
          הקודם עד שהנתונים החדשים מגיעים), ומצב הטעינה מסומן רק בסימון עדין ליד התאריך. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={date}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.17 } }}
          exit={{ opacity: 0, transition: { duration: 0.11 } }}
          className="flex flex-col gap-6"
        >
          {dayTotals.hasAnyNutrition && (
            <Card className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-primary-50 text-caption font-semibold text-ink-800 tabular-nums">
              <span className="flex items-center gap-1 text-body">
                <Flame className="h-4 w-4 text-primary-600" aria-hidden />
                סה״כ היום: {roundForDisplay(dayTotals.kcal)} קק״ל{dayTotals.isPartial && ' (חלקי)'}
              </span>
              <span className="font-normal text-ink-600">חלבון {roundForDisplay(dayTotals.proteinG)} ג׳</span>
              <span className="font-normal text-ink-600">פחמימות {roundForDisplay(dayTotals.carbsG)} ג׳</span>
              <span className="font-normal text-ink-600">שומן {roundForDisplay(dayTotals.fatG)} ג׳</span>
            </Card>
          )}

          <section className="flex flex-col gap-2">
            <h2 className="text-subtitle text-ink-900">ארוחות היום</h2>
            {JOURNAL_MEAL_ORDER.map((type, i) => (
              <MealTypeSlot
                key={type}
                mealType={type}
                meals={meals.filter((m) => m.mealType === type)}
                imageFirst={i % 2 === 0}
                onAdd={() => openAdd(type)}
                onOpen={(meal) => setViewingMeal(meal)}
                onMenu={(meal) => setActionsMeal(meal)}
              />
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-subtitle text-ink-900">שתייה</h3>
              <Button size="md" variant="secondary" onClick={() => setQuickAddKind('water')}>
                <Plus className="h-4 w-4" aria-hidden />
                הוספה
              </Button>
            </div>
            <Card className="p-0">
              {water.length === 0 ? (
                <p className="px-4 py-4 text-caption text-ink-600">אין רישומי שתייה ליום זה</p>
              ) : (
                <ul className="divide-y divide-border">
                  {water.map((w) => (
                    <li key={w.id} className="flex items-center gap-3 px-4 py-3 first:pt-3.5 last:pb-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                        <Droplet className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="flex-1 text-body font-medium text-ink-800">{w.amountMl} מ״ל</span>
                      <button
                        className="flex h-11 w-11 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-coral-50 hover:text-coral-600"
                        aria-label="מחיקת רישום שתייה"
                        onClick={() => handleDeleteWater(w)}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-subtitle text-ink-900">פעילות</h3>
              <Button size="md" variant="secondary" onClick={() => setQuickAddKind('activity')}>
                <Plus className="h-4 w-4" aria-hidden />
                הוספה
              </Button>
            </div>
            <Card className="p-0">
              {activity.length === 0 ? (
                <p className="px-4 py-4 text-caption text-ink-600">אין רישומי פעילות ליום זה</p>
              ) : (
                <ul className="divide-y divide-border">
                  {activity.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-4 py-3 first:pt-3.5 last:pb-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                        <Footprints className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="flex flex-1 items-center gap-2 text-body font-medium text-ink-800">
                        <Pill tone="neutral">{a.activityType}</Pill> {a.durationMinutes} דק׳
                      </span>
                      <button
                        className="flex h-11 w-11 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-coral-50 hover:text-coral-600"
                        aria-label="מחיקת רישום פעילות"
                        onClick={() => handleDeleteActivity(a)}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </motion.div>
      </AnimatePresence>

      <MealFormModal
        open={mealModalOpen}
        date={date}
        mealType={addMealType}
        meal={editingMeal}
        onClose={() => setMealModalOpen(false)}
        onSaved={load}
      />
      <MealDetailModal
        meal={viewingMeal}
        onClose={() => setViewingMeal(null)}
        onEdit={(meal) => {
          setViewingMeal(null)
          setEditingMeal(meal)
          setAddMealType(undefined)
          setMealModalOpen(true)
        }}
      />
      <MealActionsModal
        meal={actionsMeal}
        onClose={() => setActionsMeal(null)}
        onEdit={(meal) => {
          setEditingMeal(meal)
          setAddMealType(undefined)
          setMealModalOpen(true)
        }}
        onDuplicate={(meal) => setDuplicateMeal(meal)}
        onSaveFavorite={async (meal) => {
          if (!user) return
          await favoritesService.addFavoriteFromMeal(user.id, meal, meal.items[0]?.foodName ?? 'ארוחה שמורה')
          showToast('נשמר במועדפים', 'success')
        }}
        onDelete={async (meal) => {
          if (!user) return
          await mealsService.deleteMeal(user.id, meal.id)
          showToast('הארוחה נמחקה', 'success')
          load()
        }}
      />
      <DuplicateMealModal meal={duplicateMeal} onClose={() => setDuplicateMeal(null)} onSaved={load} />
      <QuickAddSheet open={quickAddKind !== null} kind={quickAddKind ?? 'water'} date={date} onClose={() => setQuickAddKind(null)} onSaved={load} />
    </AppShell>
  )
}
