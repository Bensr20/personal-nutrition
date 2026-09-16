import { describe, expect, it } from 'vitest'
import { fetchProductByBarcode, sanitizeBarcode, OffError } from '@/services/foods/offClient'

// שלושת הברקודים המאומתים מהמפרט — מוגשים מ-fixtures מקומיים (ללא קריאת רשת בבדיקה),
// כדי לשמור על דטרמיניזם. בדיקת חיבור חיה בוצעה בנפרד ומתועדת במסירה.
describe('sanitizeBarcode', () => {
  it('שומר אפסים מובילים ומקבל רק ספרות', () => {
    expect(sanitizeBarcode(' 7290004127329 ')).toBe('7290004127329')
    expect(sanitizeBarcode('abc')).toBeNull()
    expect(sanitizeBarcode('123')).toBeNull()
  })
})

describe('fetchProductByBarcode — fixtures מאומתים', () => {
  it('קוטג\' תנובה 5% (7290004127329): 95/11/1.5/5', async () => {
    const item = await fetchProductByBarcode('7290004127329')
    expect(item.per100).toEqual({ kcal: 95, proteinG: 11, carbsG: 1.5, fatG: 5 })
    expect(item.brand).toBe('תנובה')
  })

  it('לאבנה גד 5% (7290005992735): 87/8.5/2/5', async () => {
    const item = await fetchProductByBarcode('7290005992735')
    expect(item.per100).toEqual({ kcal: 87, proteinG: 8.5, carbsG: 2, fatG: 5 })
  })

  it('לאבנה עיזים גד 5% (7290006492685): 92/5.3/6.5/5', async () => {
    const item = await fetchProductByBarcode('7290006492685')
    expect(item.per100).toEqual({ kcal: 92, proteinG: 5.3, carbsG: 6.5, fatG: 5 })
  })

  it('ברקוד לא תקין נזרק כשגיאה מסווגת ולא כמוצר ריק/דמה', async () => {
    await expect(fetchProductByBarcode('abc')).rejects.toBeInstanceOf(OffError)
  })
})
