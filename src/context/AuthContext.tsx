import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService, profileService, isDemoMode } from '@/services'
import type { Profile } from '@/types/domain'
import type { AuthUser } from '@/services/types'

interface AuthContextValue {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  isDemoMode: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (u: AuthUser | null) => {
    if (!u) {
      setProfile(null)
      return
    }
    try {
      const p = await profileService.getProfile(u.id)
      setProfile(p)
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let active = true
    authService.getSession().then(async (u) => {
      if (!active) return
      setUser(u)
      await loadProfile(u)
      if (active) setLoading(false)
    })
    const unsubscribe = authService.onAuthChange(async (u) => {
      if (!active) return
      setUser(u)
      await loadProfile(u)
      setLoading(false)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    await loadProfile(user)
  }, [user, loadProfile])

  const signOut = useCallback(async () => {
    await authService.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading, isDemoMode, refreshProfile, signOut }),
    [user, profile, loading, refreshProfile, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth חייב לרוץ בתוך AuthProvider')
  return ctx
}
