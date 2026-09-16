import { useEffect, useState } from 'react'
import type { MealType } from '@/types/domain'
import { mealsService } from '@/services'
import { useAuth } from '@/context/AuthContext'

interface Props {
  photoPath: string | null
  mealType: MealType
  size?: 'sm' | 'md' | 'lg'
  className?: string
  rounded?: string
}

const SIZE_CLASS = { sm: 'h-16 w-16', md: 'h-20 w-20', lg: 'h-full w-full' }
const SIZE_PX = { sm: 64, md: 80, lg: 92 }

// תמונת קטגוריה איכותית לכל סוג ארוחה, כשאין תמונה אישית — לא איור/אימוג'י.
// ראו public/images/meals/SOURCES.md למקור ולרישיון. תמיד מסומנת ב-badge "המחשה"
// (גם על ארוחה רשומה וגם על סלוט ריק) כדי שלעולם לא תיראה כתיעוד אמיתי של מה שנאכל.
export const CATEGORY_IMAGE: Record<MealType, string> = {
  breakfast: '/images/meals/breakfast.jpg',
  lunch: '/images/meals/lunch.jpg',
  dinner: '/images/meals/dinner.jpg',
  snack: '/images/meals/snack.jpg',
}

function isDirectUrl(path: string) {
  return path.startsWith('data:') || path.startsWith('http') || path.startsWith('blob:')
}

// תמונה אישית שהועלתה בפועל תמיד קודמת. בהיעדרה מוצגת תמונת הקטגוריה עם badge "המחשה" —
// לא מוחלף באייקון גנרי, כדי שסלוט ריק וארוחה רשומה-בלי-תמונה ייראו עקביים ועשירים באותה מידה.
export function MealPhoto({ photoPath, mealType, size = 'md', className = '', rounded = 'rounded-2xl' }: Props) {
  const { user } = useAuth()
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(photoPath && isDirectUrl(photoPath) ? photoPath : null)
  const px = SIZE_PX[size]

  useEffect(() => {
    if (!photoPath || isDirectUrl(photoPath) || !user) {
      setResolvedUrl(photoPath && isDirectUrl(photoPath) ? photoPath : null)
      return
    }
    let active = true
    mealsService.getPhotoUrl(user.id, photoPath).then((url) => {
      if (active) setResolvedUrl(url)
    })
    return () => {
      active = false
    }
  }, [photoPath, user])

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt=""
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        className={`${SIZE_CLASS[size]} ${rounded} shrink-0 object-cover object-center ${className}`}
      />
    )
  }

  return (
    <div className={`relative ${SIZE_CLASS[size]} ${rounded} shrink-0 overflow-hidden ${className}`}>
      <img
        src={CATEGORY_IMAGE[mealType]}
        alt=""
        aria-hidden
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover object-center"
      />
      <span className="absolute bottom-1 end-1 rounded-full bg-ink-900/70 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">
        המחשה
      </span>
    </div>
  )
}
