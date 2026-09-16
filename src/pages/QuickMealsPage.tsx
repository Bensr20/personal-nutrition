import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner, EmptyState, Pill } from '@/components/ui/Misc'
import { QuickMealFormModal } from '@/components/meals/QuickMealFormModal'
import { favoritesService, mealsService } from '@/services'
import { todayKey, nowTimeKey } from '@/lib/dateUtils'
import { computeMealTotals, roundForDisplay } from '@/lib/nutritionCalc'
import { MEAL_TYPE_LABELS } from '@/types/domain'
import type { FavoriteMeal } from '@/types/domain'
import { Plus, Trash2, Check, Flame, Star } from '@/components/ui/icons'

export function QuickMealsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      setFavorites(await favoritesService.listFavorites(user.id))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'טעינת הארוחות המהירות נכשלה', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, showToast])

  useEffect(() => {
    load()
  }, [load])

  if (!user) return null

  async function addToToday(fav: FavoriteMeal) {
    if (!user || addingId) return
    setAddingId(fav.id)
    try {
      await mealsService.createMeal(user.id, {
        mealDate: todayKey(),
        mealTime: nowTimeKey(),
        mealType: fav.mealType ?? 'snack',
        note: fav.note,
        items: fav.items,
      })
      showToast(`"${fav.name}" נוספה ליומן היום`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ההוספה נכשלה, נסו שוב', 'error')
    } finally {
      setAddingId(null)
    }
  }

  async function handleDelete(fav: FavoriteMeal) {
    if (!user || deletingId) return
    setDeletingId(fav.id)
    try {
      await favoritesService.deleteFavorite(user.id, fav.id)
      setFavorites((prev) => prev.filter((f) => f.id !== fav.id))
      showToast('הארוחה המהירה נמחקה', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'המחיקה נכשלה', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AppShell title="ארוחות מהירות">
      <div className="mb-5 flex items-center justify-between animate-fade-in">
        <p className="text-caption text-ink-500">שמרו ארוחה פעם אחת, והוסיפו אותה ליומן בלחיצה אחת</p>
        <Button size="md" onClick={() => setFormOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" aria-hidden />
          חדשה
        </Button>
      </div>

      {loading ? (
        <Spinner />
      ) : favorites.length === 0 ? (
        <EmptyState
          icon={<Star className="h-5 w-5" aria-hidden />}
          title="אין עדיין ארוחות מהירות"
          description='למשל: "טורטייה עם מקושקשת" — הטורטייה, 2 ביצים, גבינת שמנת. תשמרו פעם אחת ותוסיפו ביומן בלחיצה.'
          action={
            <Button size="md" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              יצירת ארוחה מהירה
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {favorites.map((fav) => {
            const totals = computeMealTotals(fav.items)
            return (
              <Card key={fav.id} className="animate-fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-subtitle text-ink-900">{fav.name}</h3>
                      {fav.mealType && <Pill>{MEAL_TYPE_LABELS[fav.mealType]}</Pill>}
                    </div>
                    {fav.items.length > 0 && (
                      <p className="mt-1 text-caption text-ink-500">{fav.items.map((i) => i.foodName).join(', ')}</p>
                    )}
                    {totals.hasAnyNutrition && (
                      <p className="mt-1.5 flex items-center gap-1 text-caption font-medium text-ink-600 tabular-nums">
                        <Flame className="h-3.5 w-3.5 text-primary-500" aria-hidden />
                        {roundForDisplay(totals.kcal)} קק״ל{totals.isPartial && ' (חלקי)'}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(fav)}
                    disabled={deletingId === fav.id}
                    aria-label="מחיקת ארוחה מהירה"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-400 transition-colors hover:bg-coral-50 hover:text-coral-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <Button size="md" onClick={() => addToToday(fav)} loading={addingId === fav.id} className="mt-3.5 w-full sm:w-auto">
                  <Check className="h-4 w-4" aria-hidden />
                  הוספה ליומן היום
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      <QuickMealFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />
    </AppShell>
  )
}
