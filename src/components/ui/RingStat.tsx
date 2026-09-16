interface RingStatProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  colorClassName: string // tailwind text-* class controlling stroke via currentColor
}

// טבעת התקדמות — יש להציג רק כאשר קיימים גם ערך וגם יעד תקפים (value>0 ו-max>0),
// באחריות הרכיב הקורא.
export function RingStat({ value, max, size = 56, strokeWidth = 6, colorClassName }: RingStatProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(1, max > 0 ? value / max : 0))
  const offset = circumference * (1 - progress)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-ink-200" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={colorClassName}
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  )
}
