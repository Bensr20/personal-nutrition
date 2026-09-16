import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { profileService } from '@/services'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { Card, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/context/ToastContext'

export function OnboardingPage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [goalText, setGoalText] = useState('')
  const [eatingPreferences, setEatingPreferences] = useState('')
  const [dislikedFoods, setDislikedFoods] = useState('')
  const [allergies, setAllergies] = useState('')
  const [startingWeight, setStartingWeight] = useState('')
  const [waterGoal, setWaterGoal] = useState('')
  const [activityGoal, setActivityGoal] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && !user) return <Navigate to="/login" replace />
  if (profile?.onboardingCompleted) return <Navigate to="/today" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting || !user) return
    if (!displayName.trim()) {
      showToast('נא להזין שם לתצוגה', 'error')
      return
    }
    setSubmitting(true)
    try {
      await profileService.completeOnboarding(user.id, {
        displayName: displayName.trim(),
        goalText: goalText.trim(),
        eatingPreferences: eatingPreferences.trim(),
        dislikedFoods: dislikedFoods.trim(),
        allergies: allergies.trim(),
        startingWeightKg: startingWeight ? Number(startingWeight) : null,
        waterGoalMl: waterGoal ? Number(waterGoal) : null,
        activityGoalMinutes: activityGoal ? Number(activityGoal) : null,
      })
      await refreshProfile()
      navigate('/today', { replace: true })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שמירה נכשלה, נסו שוב', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg px-4 py-8 sm:flex sm:items-center sm:justify-center">
      <div className="mx-auto w-full max-w-lg animate-fade-in">
        <div className="mb-6 text-center">
          <h1 className="text-title text-ink-900">קצת עליך</h1>
          <p className="mt-1 text-caption text-ink-500">כמה שאלות קצרות שיעזרו לנו להתאים את המרחב אליך. אפשר לדלג ולהשלים בהמשך בהגדרות.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <CardTitle>פרטים בסיסיים</CardTitle>
            <Input id="displayName" label="שם לתצוגה" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Textarea
              id="goalText"
              label="המטרה שלך"
              hint="אופציונלי — בכתיבה חופשית, לדוגמה: 'לאכול מודעות יותר'"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
            />
          </Card>

          <Card className="flex flex-col gap-4">
            <CardTitle>העדפות אכילה</CardTitle>
            <Textarea
              id="eatingPreferences"
              label="העדפות אכילה"
              hint="אופציונלי, לדוגמה: צמחוני, ים תיכוני"
              value={eatingPreferences}
              onChange={(e) => setEatingPreferences(e.target.value)}
            />
            <Textarea
              id="dislikedFoods"
              label="מזונות שלא אוהבים"
              hint="אופציונלי"
              value={dislikedFoods}
              onChange={(e) => setDislikedFoods(e.target.value)}
            />
            <Textarea
              id="allergies"
              label="אלרגיות או רגישויות"
              hint="אופציונלי"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
            />
          </Card>

          <Card className="flex flex-col gap-4">
            <CardTitle>יעדים ומדידה</CardTitle>
            <p className="text-caption text-ink-500">כל השדות כאן אופציונליים — נשתמש בהם רק כדי להציג התקדמות, לא נחשב עבורך יעדים אוטומטית.</p>
            <Input
              id="startingWeight"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              label="משקל פתיחה (ק״ג)"
              value={startingWeight}
              onChange={(e) => setStartingWeight(e.target.value)}
            />
            <Input
              id="waterGoal"
              type="number"
              inputMode="numeric"
              min="0"
              label="יעד שתייה יומי (מ״ל)"
              value={waterGoal}
              onChange={(e) => setWaterGoal(e.target.value)}
            />
            <Input
              id="activityGoal"
              type="number"
              inputMode="numeric"
              min="0"
              label="יעד פעילות יומי (דקות)"
              value={activityGoal}
              onChange={(e) => setActivityGoal(e.target.value)}
            />
          </Card>

          <Button type="submit" size="lg" loading={submitting}>
            סיום והתחלה
          </Button>
        </form>
      </div>
    </div>
  )
}
