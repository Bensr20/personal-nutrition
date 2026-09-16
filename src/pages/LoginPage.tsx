import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { authService } from '@/services'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Card } from '@/components/ui/Card'
import { Leaf, AlertCircle } from '@/components/ui/icons'

export function LoginPage() {
  const { user, loading, isDemoMode } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/today" replace />

  async function handleDemoEnter() {
    setSubmitting(true)
    await authService.signInWithPassword('', '')
    setSubmitting(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    const result = mode === 'signin' ? await authService.signInWithPassword(email, password) : await authService.signUp(email, password)
    setSubmitting(false)
    if (result.error) setError(result.error)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white">
            <Leaf className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-title text-ink-900">התזונה שלי</h1>
          <p className="mt-1 text-caption text-ink-500">המרחב האישי שלך למעקב תזונה ואיזון יומיומי</p>
        </div>

        <Card>
          {isDemoMode ? (
            <div className="flex flex-col gap-4">
              <p className="text-center text-body text-ink-600">
                Supabase עדיין לא מחובר. אפשר להיכנס למצב הדגמה עם נתונים לדוגמה כדי לנסות את האפליקציה.
              </p>
              <Button size="lg" onClick={handleDemoEnter} loading={submitting}>
                כניסה למצב הדגמה
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex rounded-control bg-bg p-1 text-body font-semibold">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`flex-1 rounded-lg py-2 transition-colors ${mode === 'signin' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500'}`}
                >
                  התחברות
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`flex-1 rounded-lg py-2 transition-colors ${mode === 'signup' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500'}`}
                >
                  הרשמה
                </button>
              </div>

              <Input
                id="email"
                type="email"
                label="אימייל"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                id="password"
                type="password"
                label="סיסמה"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && (
                <p className="flex items-center gap-1.5 text-caption font-medium text-coral-600" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" loading={submitting}>
                {mode === 'signin' ? 'התחברות' : 'יצירת חשבון'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
