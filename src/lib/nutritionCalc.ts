// מנוע חישוב תזונתי טהור (ללא תלות ב-React/שירותים) — קלט/פלט דטרמיניסטיים לבדיקות.
import type { MealItem, MealItemInput, NutritionSnapshot } from '@/types/domain'

export const KJ_PER_KCAL = 4.184

/** ממיר קילוג'אול לקק"ל. יש להשתמש רק כשמקור הנתונים נותן קילוג'אול במפורש. */
export function kjToKcal(kj: number): number {
  return kj / KJ_PER_KCAL
}

export interface Per100 {
  kcal: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
}

/**
 * מחשב ערכים לכמות בפועל מתוך ערכים ל-100 גרם/מ"ל ומשקל בגרם/מ"ל שנפתר בפועל.
 * ללא עיגול ביניים — עיגול מתבצע רק בתצוגה. ערך חסר במקור נשאר null (לא הופך לאפס).
 */
export function computeItemNutrition(per100: Per100, amountInBaseUnit: number): NutritionSnapshot {
  const scale = amountInBaseUnit / 100
  const kcal = per100.kcal == null ? null : per100.kcal * scale
  const proteinG = per100.proteinG == null ? null : per100.proteinG * scale
  const carbsG = per100.carbsG == null ? null : per100.carbsG * scale
  const fatG = per100.fatG == null ? null : per100.fatG * scale
  const isPartial = kcal == null || proteinG == null || carbsG == null || fatG == null
  return { kcal, proteinG, carbsG, fatG, isPartial }
}

export interface MealTotals {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  /** true אם לפחות לפריט אחד עם ניסיון חישוב חסר ערך (סכום חלקי, לא לבלבל עם "אין נתונים בכלל") */
  isPartial: boolean
  /** true אם אף פריט לא נושא נתון תזונתי (למשל רק פריטי טקסט חופשי) */
  hasAnyNutrition: boolean
}

function addTotals(items: (MealItemInput | MealItem)[]): MealTotals {
  let kcal = 0
  let proteinG = 0
  let carbsG = 0
  let fatG = 0
  let isPartial = false
  let hasAnyNutrition = false

  for (const item of items) {
    const n = item.nutrition
    if (!n) continue
    hasAnyNutrition = true
    if (n.isPartial) isPartial = true
    if (n.kcal != null) kcal += n.kcal
    else isPartial = true
    if (n.proteinG != null) proteinG += n.proteinG
    if (n.carbsG != null) carbsG += n.carbsG
    if (n.fatG != null) fatG += n.fatG
  }

  return { kcal, proteinG, carbsG, fatG, isPartial, hasAnyNutrition }
}

export function computeMealTotals(items: (MealItemInput | MealItem)[]): MealTotals {
  return addTotals(items)
}

export function computeDayTotals(mealsItems: (MealItemInput | MealItem)[][]): MealTotals {
  return addTotals(mealsItems.flat())
}

/** עיגול לתצוגה בלבד — לעולם לא לפני סכימה. */
export function roundForDisplay(value: number): number {
  return Math.round(value * 10) / 10
}
