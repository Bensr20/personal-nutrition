import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from './icons'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  // primary-600 (לא 500) מתחת לטקסט לבן: primary-500 נותן ~4.48:1, מתחת לסף AA 4.5:1 לטקסט רגיל.
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700 disabled:bg-primary-200 shadow-soft',
  secondary: 'bg-white text-ink-900 border border-ink-200 hover:bg-bg active:bg-bg-soft disabled:opacity-50',
  ghost: 'bg-transparent text-ink-700 hover:bg-bg active:bg-bg-soft disabled:opacity-50',
  danger: 'bg-coral-50 text-coral-600 hover:bg-coral-100 active:bg-coral-100 disabled:opacity-50',
}

const sizeClasses: Record<Size, string> = {
  md: 'h-12 px-5 text-body font-semibold rounded-pill',
  lg: 'h-[52px] px-6 text-body font-bold rounded-pill',
  icon: 'h-11 w-11 rounded-full',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 transition duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:cursor-not-allowed active:scale-[0.98]',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
