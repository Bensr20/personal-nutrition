import { GlassWater } from './icons'

interface Props {
  totalGlasses: number
  filledGlasses: number
}

// שורת "כוסות מים" — מוצגת רק כאשר יש יעד שתייה תקף (totalGlasses מחושב מהיעד).
export function WaterGlassRow({ totalGlasses, filledGlasses }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: totalGlasses }, (_, i) => {
        const filled = i < filledGlasses
        return (
          <div
            key={i}
            className={[
              'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
              filled ? 'bg-teal-500 text-white' : 'bg-white text-ink-300 border border-ink-200',
            ].join(' ')}
          >
            <GlassWater className="h-[18px] w-[18px]" aria-hidden />
          </div>
        )
      })}
    </div>
  )
}
