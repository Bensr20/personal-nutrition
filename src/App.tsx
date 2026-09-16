import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui/Misc'
import { LoginPage } from '@/pages/LoginPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { TodayPage } from '@/pages/TodayPage'
import { JournalPage } from '@/pages/JournalPage'
import { QuickMealsPage } from '@/pages/QuickMealsPage'
import { PlanPage } from '@/pages/PlanPage'
import { ProgressPage } from '@/pages/ProgressPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spinner />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!profile?.onboardingCompleted) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        path="/today"
        element={
          <RequireAuth>
            <TodayPage />
          </RequireAuth>
        }
      />
      <Route
        path="/journal"
        element={
          <RequireAuth>
            <JournalPage />
          </RequireAuth>
        }
      />
      <Route
        path="/favorites"
        element={
          <RequireAuth>
            <QuickMealsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/plan"
        element={
          <RequireAuth>
            <PlanPage />
          </RequireAuth>
        }
      />
      <Route
        path="/progress"
        element={
          <RequireAuth>
            <ProgressPage />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/today" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
