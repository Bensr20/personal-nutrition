import type { ReactNode } from 'react'
import { Loader2, Sparkles } from './icons'

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-10 ${className}`}>
      <Loader2 className="h-7 w-7 animate-spin text-primary-500" aria-hidden />
      <span className="sr-only">טוען…</span>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-card border border-dashed border-ink-200 bg-white/60 px-6 py-10 text-center animate-fade-in">
      {icon && <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-500">{icon}</div>}
      <p className="text-body font-semibold text-ink-800">{title}</p>
      {description && <p className="text-caption text-ink-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-30 flex w-full items-center justify-center gap-1.5 bg-primary-500 px-4 py-1.5 text-center text-caption font-semibold text-white">
      <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
      מצב הדגמה — נתונים לדוגמה, ללא שמירה בענן
    </div>
  )
}

type PillTone = 'primary' | 'teal' | 'orange' | 'gold' | 'mint' | 'coral' | 'neutral'

const PILL_TONES: Record<PillTone, string> = {
  primary: 'bg-primary-50 text-primary-600',
  teal: 'bg-teal-100 text-teal-600',
  orange: 'bg-orange-100 text-orange-600',
  gold: 'bg-gold-100 text-gold-600',
  mint: 'bg-mint-100 text-mint-600',
  coral: 'bg-coral-50 text-coral-600',
  neutral: 'bg-bg text-ink-500',
}

export function Pill({ children, tone = 'primary' }: { children: ReactNode; tone?: PillTone }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-micro ${PILL_TONES[tone]}`}>{children}</span>
}
