import type { AuthService, AuthUser } from '../types'
import { DEMO_USER_ID, isDemoSessionActive, setDemoSessionActive } from './demoStore'

type Listener = (user: AuthUser | null) => void

const listeners = new Set<Listener>()

function currentUser(): AuthUser | null {
  return isDemoSessionActive() ? { id: DEMO_USER_ID, email: null } : null
}

function notify() {
  const user = currentUser()
  listeners.forEach((cb) => cb(user))
}

export const demoAuthService: AuthService = {
  isDemo: true,

  async getSession() {
    return currentUser()
  },

  onAuthChange(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },

  async signInWithPassword() {
    setDemoSessionActive(true)
    notify()
    return { error: null }
  },

  async signUp() {
    setDemoSessionActive(true)
    notify()
    return { error: null }
  },

  async signOut() {
    setDemoSessionActive(false)
    notify()
  },
}
