import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { BottomNav } from './BottomNav'
import { SideNav } from './SideNav'
import { TopBar } from './TopBar'
import { DemoBanner } from '@/components/ui/Misc'

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { isDemoMode } = useAuth()

  return (
    <div className="min-h-dvh bg-bg sm:pr-64">
      {isDemoMode && <DemoBanner />}
      <TopBar title={title} />
      <SideNav />
      <main className="mx-auto w-full max-w-3xl px-5 pb-28 pt-5 sm:px-10 sm:pb-12 sm:pt-10">{children}</main>
      <BottomNav />
    </div>
  )
}
