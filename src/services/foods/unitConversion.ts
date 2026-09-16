// פתרון כמות->גרם עבור פריט קטלוג. אין המרה שקטה בין יחידות ללא מיפוי מפורש במקור הנתונים:
// יחידה שלא נמצאה במאגר עבור המזון הספציפי מוחזרת כ-null ולא מקבלת משקל מומצא.
import type { FoodCatalogItem, FoodUnitOption } from './foodTypes'

export const GRAMS_UNIT: FoodUnitOption = { code: 'g', labelHe: 'גרם', grams: 1 }

export function listSelectableUnits(item: FoodCatalogItem): FoodUnitOption[] {
  return [GRAMS_UNIT, ...item.units]
}

export function findUnit(item: FoodCatalogItem, unitCode: string): FoodUnitOption | null {
  if (unitCode === 'g') return GRAMS_UNIT
  return item.units.find((u) => u.code === unitCode) ?? null
}

/**
 * ממיר כמות (למשל "2 כפות") למשקל בגרם על בסיס משקל יחידה שנשלף מהמקור (או הוזן/שונה ידנית ב-UI).
 * gramsPerUnit מועבר במפורש (ולא נגזר כאן שוב) כדי לתמוך במקרה שהמשתמש שינה את המשקל בממשק.
 */
export function resolveAmountGrams(quantity: number, gramsPerUnit: number): number {
  return quantity * gramsPerUnit
}
