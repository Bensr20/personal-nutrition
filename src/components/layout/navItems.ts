import { Home, BookOpen, CalendarDays, TrendingUp, Star } from '@/components/ui/icons'
import type { ComponentType } from 'react'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/today', label: 'היום שלי', icon: Home },
  { to: '/journal', label: 'יומן', icon: BookOpen },
  { to: '/favorites', label: 'ארוחות מהירות', icon: Star },
  { to: '/plan', label: 'התוכנית שלי', icon: CalendarDays },
  { to: '/progress', label: 'התקדמות', icon: TrendingUp },
]
