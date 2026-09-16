export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'בוקר',
  lunch: 'צהריים',
  dinner: 'ערב',
  snack: 'ביניים',
}

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
export const DAY_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

export interface Profile {
  id: string
  displayName: string
  goalText: string | null
  eatingPreferences: string | null
  dislikedFoods: string | null
  allergies: string | null
  startingWeightKg: number | null
  waterGoalMl: number | null
  activityGoalMinutes: number | null
  onboardingCompleted: boolean
  createdAt: string
  updatedAt: string
}

export type FoodSource = 'israeli_db' | 'off' | 'user'

export interface FoodRef {
  source: FoodSource
  sourceId: string
  brand: string | null
  barcode: string | null
}

export interface NutritionSnapshot {
  kcal: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  isPartial: boolean
}

export interface MealItemInput {
  foodName: string
  quantity: number
  unit: string
  // הבאים אופציונליים: פריט שנוסף ידנית (טקסט חופשי) לא יכיל אותם, ולא ייכלל בסיכום הקלוריות.
  foodRef?: FoodRef | null
  unitCode?: string | null
  amountGrams?: number | null
  nutrition?: NutritionSnapshot | null
}

export interface MealItem extends MealItemInput {
  id: string
  position: number
}

export interface Meal {
  id: string
  userId: string
  mealDate: string // YYYY-MM-DD
  mealTime: string | null // HH:MM
  mealType: MealType
  note: string | null
  photoPath: string | null
  sourcePlannedMealId: string | null
  items: MealItem[]
  createdAt: string
  updatedAt: string
}

export interface MealInput {
  mealDate: string
  mealTime: string | null
  mealType: MealType
  note: string | null
  items: MealItemInput[]
  sourcePlannedMealId?: string | null
}

export interface WaterLog {
  id: string
  userId: string
  logDate: string
  amountMl: number
  loggedAt: string
}

export interface ActivityLog {
  id: string
  userId: string
  logDate: string
  activityType: string
  durationMinutes: number
  note: string | null
  loggedAt: string
}

export interface WeightLog {
  id: string
  userId: string
  logDate: string
  weightKg: number
  note: string | null
  createdAt: string
}

export interface PlannedMeal {
  id: string
  planId: string
  userId: string
  dayOfWeek: number // 0=ראשון .. 6=שבת
  mealType: MealType
  name: string
  items: MealItemInput[]
  note: string | null
  position: number
  createdAt: string
  updatedAt: string
}

export interface MealPlan {
  id: string
  userId: string
  title: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface FavoriteMeal {
  id: string
  userId: string
  name: string
  mealType: MealType | null
  items: MealItemInput[]
  note: string | null
  createdAt: string
}

export interface OnboardingInput {
  displayName: string
  goalText: string
  eatingPreferences: string
  dislikedFoods: string
  allergies: string
  startingWeightKg: number | null
  waterGoalMl: number | null
  activityGoalMinutes: number | null
}
