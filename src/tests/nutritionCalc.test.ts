import { describe, expect, it } from 'vitest'
import { computeItemNutrition, computeMealTotals, kjToKcal } from '@/lib/nutritionCalc'
import type { MealItem } from '@/types/domain'

// Fixture: קוטג' תנובה 5% (israeli_db:494 / off:7290004127329) — kcal 95, protein 11, carbs 1.5, fat 5 ל-100 גרם
const COTTAGE_PER_100 = { kcal: 95, proteinG: 11, carbsG: 1.5, fatG: 5 }
// Fixture: לאבנה גד 5% (off:7290005992735) — kcal 87, protein 8.5, carbs 2, fat 5 ל-100 גרם
const LABANE_PER_100 = { kcal: 87, proteinG: 8.5, carbsG: 2, fatG: 5 }

function item(nutrition: MealItem['nutrition']): MealItem {
  return { id: 'x', foodName: 'x', quantity: 1, unit: 'גרם', position: 0, nutrition }
}

describe('computeItemNutrition — fixture: קוטג׳ תנובה 5%', () => {
  it('200 גרם = 190 קק"ל', () => {
    const n = computeItemNutrition(COTTAGE_PER_100, 200)
    expect(n.kcal).toBe(190)
    expect(n.isPartial).toBe(false)
  })

  it('שתי כפות של 40 גרם = 80 גרם = 76 קק"ל', () => {
    const grams = 2 * 40
    const n = computeItemNutrition(COTTAGE_PER_100, grams)
    expect(grams).toBe(80)
    expect(n.kcal).toBe(76)
  })

  it('חצי גביע של 250 גרם = 125 גרם = 118.75 קק"ל לפני עיגול', () => {
    const grams = 0.5 * 250
    const n = computeItemNutrition(COTTAGE_PER_100, grams)
    expect(grams).toBe(125)
    expect(n.kcal).toBe(118.75)
  })
})

describe('computeMealTotals — פריטים נפרדים מסוכמים בלי עיגול ביניים', () => {
  it('100 גרם קוטג׳ + 100 גרם לאבנה גד 5% = 182 קק"ל, 19.5 חלבון, 3.5 פחמימות, 10 שומן', () => {
    const cottage = item(computeItemNutrition(COTTAGE_PER_100, 100))
    const labane = item(computeItemNutrition(LABANE_PER_100, 100))
    const totals = computeMealTotals([cottage, labane])
    expect(totals.kcal).toBe(182)
    expect(totals.proteinG).toBeCloseTo(19.5, 10)
    expect(totals.carbsG).toBeCloseTo(3.5, 10)
    expect(totals.fatG).toBe(10)
    expect(totals.isPartial).toBe(false)
  })
})

describe('נתון חסר נשאר null ולא הופך לאפס', () => {
  it('פריט עם kcal חסר במקור מסומן כחלקי ולא נספר כאפס בסכום המוצג', () => {
    const partial = computeItemNutrition({ kcal: null, proteinG: 5, carbsG: 5, fatG: 5 }, 100)
    expect(partial.kcal).toBeNull()
    expect(partial.isPartial).toBe(true)

    const totals = computeMealTotals([item(partial)])
    expect(totals.isPartial).toBe(true)
    expect(totals.kcal).toBe(0) // סכום החלק הידוע בלבד; הממשק חייב לסמן "חלקי" ולא להציג כארוחה מלאה
  })

  it('פריט טקסט חופשי ללא nutrition כלל לא נכלל בסיכום ולא מסמן partial', () => {
    const freeText: MealItem = { id: 'y', foodName: 'משהו', quantity: 1, unit: 'יחידה', position: 0 }
    const totals = computeMealTotals([freeText])
    expect(totals.hasAnyNutrition).toBe(false)
    expect(totals.kcal).toBe(0)
  })
})

describe('kjToKcal — המרה מפורשת בלבד כשהמקור נותן קילוג׳אול', () => {
  it('מחלק ב-4.184', () => {
    expect(kjToKcal(418.4)).toBeCloseTo(100, 5)
  })
})

describe('חישוב לדוגמה מבדיקות הקבלה של סריקת ברקוד: 200 קק"ל ל-100 גרם, כמות 30 גרם', () => {
  it('נותן 60 קק"ל', () => {
    const n = computeItemNutrition({ kcal: 200, proteinG: null, carbsG: null, fatG: null }, 30)
    expect(n.kcal).toBe(60)
  })
})
