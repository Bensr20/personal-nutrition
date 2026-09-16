import { supabase } from '@/lib/supabaseClient'
import type { AuthService, AuthUser } from '../types'

function mapUser(user: { id: string; email?: string | null } | null | undefined): AuthUser | null {
  if (!user) return null
  return { id: user.id, email: user.email ?? null }
}

export const supabaseAuthService: AuthService = {
  isDemo: false,

  async getSession() {
    const { data } = await supabase!.auth.getSession()
    return mapUser(data.session?.user)
  },

  onAuthChange(cb) {
    const { data } = supabase!.auth.onAuthStateChange((_event, session) => {
      cb(mapUser(session?.user))
    })
    return () => data.subscription.unsubscribe()
  },

  async signInWithPassword(email, password) {
    const { error } = await supabase!.auth.signInWithPassword({ email, password })
    return { error: error ? translateAuthError(error.message) : null }
  },

  async signUp(email, password) {
    const { error } = await supabase!.auth.signUp({ email, password })
    return { error: error ? translateAuthError(error.message) : null }
  },

  async signOut() {
    await supabase!.auth.signOut()
  },
}

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'אימייל או סיסמה שגויים'
  if (/already registered/i.test(message)) return 'כתובת האימייל כבר רשומה במערכת'
  if (/password/i.test(message) && /(least|short|weak)/i.test(message)) return 'הסיסמה קצרה מדי (נדרשים לפחות 6 תווים)'
  if (/email/i.test(message) && /invalid/i.test(message)) return 'כתובת אימייל לא תקינה'
  return 'אירעה שגיאה, נסו שוב'
}
