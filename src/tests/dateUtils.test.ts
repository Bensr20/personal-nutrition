import { describe, expect, it } from 'vitest'
import { addDays, dayOfWeek, startOfWeek, toLocalDateKey, weekDates } from '@/lib/dateUtils'

describe('dateUtils', () => {
  it('toLocalDateKey formats using local date parts, not UTC', () => {
    const d = new Date(2026, 0, 5) // 5 בינואר 2026, שעה מקומית 00:00
    expect(toLocalDateKey(d)).toBe('2026-01-05')
  })

  it('addDays crosses month and year boundaries correctly', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('dayOfWeek returns 0 for Sunday through 6 for Saturday', () => {
    // 2026-01-04 הוא יום ראשון
    expect(dayOfWeek('2026-01-04')).toBe(0)
    expect(dayOfWeek('2026-01-10')).toBe(6)
  })

  it('startOfWeek always resolves to the Sunday of that week', () => {
    expect(startOfWeek('2026-01-07')).toBe('2026-01-04')
    expect(startOfWeek('2026-01-04')).toBe('2026-01-04')
  })

  it('weekDates returns 7 consecutive days starting from the given key', () => {
    const week = weekDates('2026-01-04')
    expect(week).toHaveLength(7)
    expect(week[0]).toBe('2026-01-04')
    expect(week[6]).toBe('2026-01-10')
  })
})
