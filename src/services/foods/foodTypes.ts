import type { FoodSource } from '@/types/domain'

export interface FoodUnitOption {
  code: string
  labelHe: string
  grams: number
}

export interface FoodCatalogItem {
  id: string // `${source}:${sourceId}`
  source: FoodSource
  sourceId: string
  originalName: string
  displayNameHe: string
  englishName: string | null
  brand: string | null
  barcode: string | null
  imageUrl: string | null
  per100: {
    kcal: number | null
    proteinG: number | null
    carbsG: number | null
    fatG: number | null
  }
  baseUnit: 'g' | 'ml'
  units: FoodUnitOption[]
  fetchedAt: string
  sourceUpdatedAt: string | null
  verified: boolean
}

export interface FoodSearchResult {
  item: FoodCatalogItem
  score: number
}

/** "היחידה שלי" — משקל שהמשתמש קבע ושמר בעצמו למוצר ספציפי (למשל "הקערה שלי" לקורנפלקס). */
export interface UserFoodUnit {
  id: string
  label: string
  grams: number
}

export interface UserFoodInput {
  displayName: string
  brand: string | null
  barcode: string | null
  kcalPer100: number | null
  proteinPer100: number | null
  carbsPer100: number | null
  fatPer100: number | null
}

export interface FoodCatalogService {
  /** חיפוש מיידי (debounce באחריות הקורא) במאגר המקומי בלבד — ללא קריאת רשת. */
  search(userId: string, query: string, limit?: number): Promise<FoodSearchResult[]>
  getById(userId: string, id: string): Promise<FoodCatalogItem | null>
  /** מספר הרשומות הזמינות במאגר המקומי כרגע (למטרות דיווח/דיבוג). */
  count(): Promise<number>
  /** השלמת מוצר חסר מהתווית — נשמר פרטית למשתמש בלבד, לא לקטלוג הציבורי. */
  addUserFood(userId: string, input: UserFoodInput): Promise<FoodCatalogItem>
  listUserFoods(userId: string): Promise<FoodCatalogItem[]>
  /**
   * מוצר פרטי שהמשתמש שמר/תיקן עם ברקוד תואם — נבדק תמיד לפני פנייה לספק חיצוני, כך שתיקון
   * שהמשתמש ביצע למוצר קיים מקבל עדיפות בסריקות הבאות.
   */
  findUserFoodByBarcode(userId: string, barcode: string): Promise<FoodCatalogItem | null>
  /** יחידות אישיות שנשמרו למוצר הספציפי הזה בלבד (לא לכל מוצרי הקטגוריה). */
  listUserFoodUnits(userId: string, source: FoodSource, sourceId: string): Promise<UserFoodUnit[]>
  saveUserFoodUnit(userId: string, source: FoodSource, sourceId: string, label: string, grams: number): Promise<UserFoodUnit>
}
