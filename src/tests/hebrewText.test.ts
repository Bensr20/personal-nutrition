import { describe, expect, it } from 'vitest'
import { matchScore, normalizeForSearch } from '@/lib/hebrewText'

describe('normalizeForSearch — נרמול כתיב', () => {
  it('מאחד גרש/גרשיים שונים לאותה מילה', () => {
    expect(normalizeForSearch('קוטג')).toBe(normalizeForSearch('קוטג׳'))
    expect(normalizeForSearch('קוטג')).toBe(normalizeForSearch("קוטג'"))
  })

  it('מתעלם מרווחים כפולים', () => {
    expect(normalizeForSearch('קוטג   תנובה')).toBe(normalizeForSearch('קוטג תנובה'))
  })
})

describe('matchScore', () => {
  it('שוויון מלא מקבל את הניקוד הגבוה ביותר', () => {
    expect(matchScore('קוטג', 'קוטג')).toBe(1)
  })

  it('אינו מתאים טקסט לא קשור', () => {
    expect(matchScore('קוטג', 'עגבניה')).toBe(0)
  })

  it('אינו הופך "גבינה לבנה" אוטומטית להתאמה עם "לאבנה"', () => {
    expect(matchScore('גבינה לבנה', 'לאבנה גד 5%')).toBe(0)
  })
})
