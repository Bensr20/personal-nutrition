import { Link } from 'react-router-dom'
import { Settings } from '@/components/ui/icons'

export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3.5 backdrop-blur sm:hidden">
      <h1 className="text-title text-ink-900">{title}</h1>
      <Link
        to="/settings"
        aria-label="הגדרות"
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-bg-soft"
      >
        <Settings className="h-[19px] w-[19px]" />
      </Link>
    </header>
  )
}
