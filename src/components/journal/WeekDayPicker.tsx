import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { DAY_LETTERS } from '@/types/domain'
import { dayOfWeek, formatDateLong, formatWeekday, isToday, weekDates } from '@/lib/dateUtils'

interface Props {
  weekStart: string
  selectedDate: string
  daysWithData: Set<string>
  onSelect: (date: string) => void
}

// רצועת ימים אופקית: היום הנבחר מודגש בסגול, וימים שיש בהם תיעוד ארוחות מסומנים
// במסגרת ירוקה — סימון אמיתי לפי נתונים, לא קישוט. הגלולה החזותית צרה (~40px) אך
// מעטפת הלחיצה של כל כפתור רחבה יותר (44px) כדי לשמור על יעד מגע נגיש. בחירת יום
// אחר מזיזה את הרקע הסגול בתנועה חלקה (layoutId משותף, לא נגעתי בתזמון הקיים שלה).
export function WeekDayPicker({ weekStart, selectedDate, daysWithData, onSelect }: Props) {
  const dates = weekDates(weekStart)
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedDate])

  return (
    <div
      className="no-scrollbar flex gap-1.5 overflow-x-auto"
      style={{
        scrollSnapType: 'x proximity',
        maskImage: 'linear-gradient(to right, transparent, black 14px, black calc(100% - 14px), transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 14px, black calc(100% - 14px), transparent)',
      }}
    >
      {dates.map((date) => {
        const selected = date === selectedDate
        const hasData = daysWithData.has(date)
        const today = isToday(date)
        const dow = dayOfWeek(date)
        const dayNum = Number(date.slice(-2))

        let borderClass = 'border border-ink-200'
        if (!selected && hasData) borderClass = 'border-2 border-mint-500'
        else if (!selected && today) borderClass = 'border-2 border-primary-200'

        return (
          <button
            key={date}
            ref={selected ? selectedRef : undefined}
            type="button"
            onClick={() => onSelect(date)}
            aria-current={selected ? 'date' : undefined}
            aria-label={`${formatWeekday(date)}, ${formatDateLong(date)}`}
            style={{ scrollSnapAlign: 'center' }}
            className="flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <span
              className={[
                'relative flex h-[66px] w-10 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-full transition-colors',
                selected ? 'shadow-soft' : `bg-white ${borderClass}`,
              ].join(' ')}
            >
              {selected && (
                <motion.span
                  layoutId="day-picker-selected-bg"
                  className="absolute inset-0 rounded-full bg-primary-600"
                  transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                />
              )}
              <span className={`relative text-micro ${selected ? 'text-white/90' : 'text-ink-600'}`}>{DAY_LETTERS[dow]}</span>
              {selected ? (
                <span className="relative flex h-[27px] w-[27px] items-center justify-center rounded-full bg-white text-caption font-bold text-primary-600">
                  {dayNum}
                </span>
              ) : (
                <span className={`relative text-subtitle ${hasData ? 'text-ink-900' : 'text-ink-700'}`}>{dayNum}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
