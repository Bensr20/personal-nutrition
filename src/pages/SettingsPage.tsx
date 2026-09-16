import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { profileService, exportService } from '@/services'
import { todayKey } from '@/lib/dateUtils'
import { Sparkles, Download, LogOut } from '@/components/ui/icons'

export function SettingsPage() {
  const { user, profile, refreshProfile, signOut, isDemoMode } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [goalText, setGoalText] = useState(profile?.goalText ?? '')
  const [eatingPreferences, setEatingPreferences] = useState(profile?.eatingPreferences ?? '')
  const [dislikedFoods, setDislikedFoods] = useState(profile?.dislikedFoods ?? '')
  const [allergies, setAllergies] = useState(profile?.allergies ?? '')
  const [waterGoal, setWaterGoal] = useState(profile?.waterGoalMl?.toString() ?? '')
  const [activityGoal, setActivityGoal] = useState(profile?.activityGoalMinutes?.toString() ?? '')

  const submitting = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting.current || !user) return
    if (!displayName.trim()) {
      showToast('נא להזין שם לתצוגה', 'error')
      return
    }
    submitting.current = true
    setIsSubmitting(true)
    try {
      await profileService.updateProfile(user.id, {
        displayName: displayName.trim(),
        goalText: goalText.trim(),
        eatingPreferences: eatingPreferences.trim(),
        dislikedFoods: dislikedFoods.trim(),
        allergies: allergies.trim(),
        waterGoalMl: waterGoal ? Number(waterGoal) : null,
        activityGoalMinutes: activityGoal ? Number(activityGoal) : null,
      })
      await refreshProfile()
      showToast('הפרופיל עודכן', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'השמירה נכשלה, נסו שוב', 'error')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  async function handleExport() {
    if (!user || isExporting) return
    setIsExporting(true)
    try {
      const data = await exportService.exportAllData(user.id)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nutrition-export-${todayKey()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast('הנתונים יוצאו בהצלחה', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'הייצוא נכשל, נסו שוב', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell title="הגדרות">
      <div className="flex flex-col gap-6">
        {isDemoMode && (
          <Card className="flex items-start gap-2.5 border-primary-100 bg-primary-50">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
            <p className="text-caption text-primary-600">
              האפליקציה פועלת כרגע במצב הדגמה. כדי לשמור נתונים אמיתיים בענן יש לחבר פרויקט Supabase (ראו README).
            </p>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <CardTitle>פרופיל</CardTitle>
            <Input id="stDisplayName" label="שם לתצוגה" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Textarea id="stGoal" label="המטרה שלך" value={goalText} onChange={(e) => setGoalText(e.target.value)} />
          </Card>

          <Card className="flex flex-col gap-4">
            <CardTitle>העדפות אכילה</CardTitle>
            <Textarea id="stPrefs" label="העדפות אכילה" value={eatingPreferences} onChange={(e) => setEatingPreferences(e.target.value)} />
            <Textarea id="stDisliked" label="מזונות שלא אוהבים" value={dislikedFoods} onChange={(e) => setDislikedFoods(e.target.value)} />
            <Textarea id="stAllergies" label="אלרגיות או רגישויות" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
          </Card>

          <Card className="flex flex-col gap-4">
            <CardTitle>יעדים</CardTitle>
            <Input id="stWaterGoal" type="number" inputMode="numeric" min="0" label="יעד שתייה יומי (מ״ל)" value={waterGoal} onChange={(e) => setWaterGoal(e.target.value)} />
            <Input id="stActivityGoal" type="number" inputMode="numeric" min="0" label="יעד פעילות יומי (דקות)" value={activityGoal} onChange={(e) => setActivityGoal(e.target.value)} />
          </Card>

          <Button type="submit" size="lg" loading={isSubmitting}>
            שמירת שינויים
          </Button>
        </form>

        <Card className="flex flex-col gap-3">
          <CardTitle>הנתונים שלי</CardTitle>
          <p className="text-caption text-ink-500">ייצוא כל הנתונים האישיים שלך כקובץ JSON להורדה.</p>
          <Button variant="secondary" onClick={handleExport} loading={isExporting} className="self-start">
            <Download className="h-4 w-4" aria-hidden />
            ייצוא נתונים (JSON)
          </Button>
        </Card>

        <Card>
          <Button variant="danger" onClick={handleSignOut} className="w-full">
            <LogOut className="h-4 w-4" aria-hidden />
            התנתקות
          </Button>
        </Card>
      </div>
    </AppShell>
  )
}
