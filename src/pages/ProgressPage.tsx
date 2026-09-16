import { useCallback, useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardTitle } from '@/components/ui/Card'
import { Spinner, EmptyState } from '@/components/ui/Misc'
import { logsService, mealsService } from '@/services'
import { addDays, formatDateShort, todayKey } from '@/lib/dateUtils'
import type { WeightLog } from '@/types/domain'
import { Scale, BookOpen, Droplet, Footprints } from '@/components/ui/icons'

const CHART_RANGE_DAYS = 90
const SUMMARY_RANGE_DAYS = 7

export function ProgressPage() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [daysWithMeals, setDaysWithMeals] = useState(0)
  const [totalWaterMl, setTotalWaterMl] = useState(0)
  const [totalActivityMin, setTotalActivityMin] = useState(0)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const today = todayKey()
      const chartStart = addDays(today, -CHART_RANGE_DAYS)
      const summaryStart = addDays(today, -(SUMMARY_RANGE_DAYS - 1))

      const [weightData, meals, water, activity] = await Promise.all([
        logsService.listWeightInRange(user.id, chartStart, today),
        mealsService.listMealsInRange(user.id, summaryStart, today),
        logsService.listWaterInRange(user.id, summaryStart, today),
        logsService.listActivityInRange(user.id, summaryStart, today),
      ])

      setWeights(weightData)
      setDaysWithMeals(new Set(meals.map((m) => m.mealDate)).size)
      setTotalWaterMl(water.reduce((s, w) => s + w.amountMl, 0))
      setTotalActivityMin(activity.reduce((s, a) => s + a.durationMinutes, 0))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'טעינת הנתונים נכשלה', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, showToast])

  useEffect(() => {
    load()
  }, [load])

  if (!user) return null

  const chartData = weights.map((w) => ({ date: formatDateShort(w.logDate), weight: w.weightKg }))
  const hasEnoughForChange = weights.length >= 2
  const change = hasEnoughForChange ? weights[weights.length - 1].weightKg - weights[0].weightKg : 0

  return (
    <AppShell title="התקדמות">
      {loading ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-6">
          <section>
            <CardTitle className="mb-3">מעקב משקל</CardTitle>
            <Card>
              {weights.length === 0 ? (
                <EmptyState
                  icon={<Scale className="h-5 w-5" aria-hidden />}
                  title="אין עדיין מדידות משקל"
                  description="הוסיפו מדידה ראשונה מהיום שלי או מהיומן כדי לראות כאן גרף"
                />
              ) : (
                <>
                  <div className="h-56 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EBEDF5" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#737B95' }} reversed />
                        <YAxis tick={{ fontSize: 11, fill: '#737B95' }} domain={['dataMin - 1', 'dataMax + 1']} orientation="right" />
                        <Tooltip
                          formatter={(value: number) => [`${value} ק״ג`, 'משקל']}
                          contentStyle={{ borderRadius: 12, borderColor: '#EBEDF5', fontSize: 13, direction: 'rtl' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="#7265E3"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#7265E3' }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {hasEnoughForChange && (
                    <p className="mt-2 text-center text-caption font-medium text-ink-600">
                      שינוי בטווח המוצג: {change > 0 ? '+' : ''}
                      {change.toFixed(1)} ק״ג
                    </p>
                  )}
                  {weights.length === 1 && <p className="mt-2 text-center text-caption text-ink-400">נדרשות שתי מדידות לפחות כדי להציג שינוי</p>}
                </>
              )}
            </Card>
          </section>

          <section>
            <CardTitle className="mb-3">סיכום 7 הימים האחרונים</CardTitle>
            <Card className="grid grid-cols-3 divide-x divide-x-reverse divide-border p-0">
              <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
                <BookOpen className="h-[18px] w-[18px] text-primary-500" aria-hidden />
                <span className="text-subtitle text-ink-900 tabular-nums">{daysWithMeals}/{SUMMARY_RANGE_DAYS}</span>
                <span className="text-micro text-ink-500">ימי תיעוד</span>
              </div>
              <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
                <Droplet className="h-[18px] w-[18px] text-teal-600" aria-hidden />
                <span className="text-subtitle text-ink-900 tabular-nums">{(totalWaterMl / 1000).toFixed(1)} ל׳</span>
                <span className="text-micro text-ink-500">סה״כ שתייה</span>
              </div>
              <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
                <Footprints className="h-[18px] w-[18px] text-orange-600" aria-hidden />
                <span className="text-subtitle text-ink-900 tabular-nums">{totalActivityMin} דק׳</span>
                <span className="text-micro text-ink-500">סה״כ פעילות</span>
              </div>
            </Card>
            <p className="mt-3 text-caption text-ink-400">
              ימים ללא תיעוד אינם נספרים כימים ללא אכילה או שתייה — הם פשוט לא נכללים בסכומים שמוצגים כאן.
            </p>
          </section>
        </div>
      )}
    </AppShell>
  )
}
