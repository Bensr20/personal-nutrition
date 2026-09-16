import type { MealType } from '@/types/domain'
import { Coffee, Soup, Moon, Apple } from '@/components/ui/icons'

const CONFIG: Record<MealType, { icon: typeof Coffee; bg: string; fg: string }> = {
  breakfast: { icon: Coffee, bg: 'bg-gold-100', fg: 'text-gold-600' },
  lunch: { icon: Soup, bg: 'bg-teal-100', fg: 'text-teal-600' },
  dinner: { icon: Moon, bg: 'bg-primary-50', fg: 'text-primary-600' },
  snack: { icon: Apple, bg: 'bg-mint-100', fg: 'text-mint-600' },
}

interface Props {
  mealType: MealType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASS = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
}
const ICON_SIZE = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-10 w-10',
}

// אילוסטרציית סוג ארוחה — עיגול צבעוני עם אייקון. משמשת כתחליף מכובד ונקי
// כאשר לא צורפה תמונה אמיתית של הארוחה (אף פעם לא תמונת מלאי המוצגת כאילו היא תמונה אמיתית).
export function MealTypeIllustration({ mealType, size = 'md', className = '' }: Props) {
  const { icon: Icon, bg, fg } = CONFIG[mealType]
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full ${bg} ${SIZE_CLASS[size]} ${className}`}>
      <Icon className={`${ICON_SIZE[size]} ${fg}`} aria-hidden />
    </div>
  )
}
