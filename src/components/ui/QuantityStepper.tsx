import { Plus, Minus } from './icons'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unitLabel?: string
}

export function QuantityStepper({ value, onChange, min = 0, max = 100000, step = 1, unitLabel }: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink-200 text-ink-500 transition-colors hover:border-ink-400 hover:text-ink-700 active:scale-95"
        aria-label="הפחת"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <div className="min-w-[5rem] text-center text-title text-ink-900 tabular-nums">
        {value}
        {unitLabel && <span className="ms-1 text-caption font-normal text-ink-500">{unitLabel}</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-500 text-white shadow-soft transition-colors hover:bg-primary-600 active:scale-95"
        aria-label="הוסף"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
