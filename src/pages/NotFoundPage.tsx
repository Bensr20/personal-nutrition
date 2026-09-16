import { Link } from 'react-router-dom'
import { Compass } from '@/components/ui/icons'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-500">
        <Compass className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="text-title text-ink-900">הדף לא נמצא</h1>
      <Link to="/today" className="font-semibold text-primary-600 underline underline-offset-2">
        חזרה להיום שלי
      </Link>
    </div>
  )
}
