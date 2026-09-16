// כל התאריכים מטופלים לפי הזמן המקומי של המכשיר (לא UTC), כדי שגבול ה"יום" יתאים למה שהמשתמש רואה בפועל.

export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(): string {
  return toLocalDateKey(new Date())
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(key: string, delta: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + delta)
  return toLocalDateKey(d)
}

export function dayOfWeek(key: string): number {
  return parseDateKey(key).getDay() // 0 = ראשון
}

export function startOfWeek(key: string): string {
  const dow = dayOfWeek(key)
  return addDays(key, -dow)
}

export function weekDates(startKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startKey, i))
}

const HE_WEEKDAY = new Intl.DateTimeFormat('he-IL', { weekday: 'long' })
const HE_DATE_LONG = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
const HE_DATE_SHORT = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' })

export function formatWeekday(key: string): string {
  return HE_WEEKDAY.format(parseDateKey(key))
}

export function formatDateLong(key: string): string {
  return HE_DATE_LONG.format(parseDateKey(key))
}

export function formatDateShort(key: string): string {
  return HE_DATE_SHORT.format(parseDateKey(key))
}

export function isToday(key: string): boolean {
  return key === todayKey()
}

export function nowTimeKey(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
