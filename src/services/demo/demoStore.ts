import { newId } from '@/lib/id'
import { addDays, todayKey } from '@/lib/dateUtils'
import type {
  ActivityLog,
  FavoriteMeal,
  FoodSource,
  Meal,
  MealPlan,
  PlannedMeal,
  Profile,
  WaterLog,
  WeightLog,
} from '@/types/domain'

export interface DemoUserFood {
  id: string
  userId: string
  displayName: string
  brand: string | null
  barcode: string | null
  kcalPer100: number | null
  proteinPer100: number | null
  carbsPer100: number | null
  fatPer100: number | null
  createdAt: string
}

export interface DemoUserFoodUnit {
  id: string
  userId: string
  foodSource: FoodSource
  foodSourceId: string
  label: string
  grams: number
  createdAt: string
}

const STORAGE_KEY = 'personal-nutrition:demo-data:v1'
const SESSION_KEY = 'personal-nutrition:demo-session:v1'

export const DEMO_USER_ID = 'demo-user'

export interface DemoData {
  profiles: Record<string, Profile>
  meals: Record<string, Meal>
  waterLogs: Record<string, WaterLog>
  activityLogs: Record<string, ActivityLog>
  weightLogs: Record<string, WeightLog>
  mealPlans: Record<string, MealPlan>
  plannedMeals: Record<string, PlannedMeal>
  favoriteMeals: Record<string, FavoriteMeal>
  userFoods: Record<string, DemoUserFood>
  userFoodUnits: Record<string, DemoUserFoodUnit>
}

function emptyData(): DemoData {
  return {
    profiles: {},
    meals: {},
    waterLogs: {},
    activityLogs: {},
    weightLogs: {},
    mealPlans: {},
    plannedMeals: {},
    favoriteMeals: {},
    userFoods: {},
    userFoodUnits: {},
  }
}

function seedData(): DemoData {
  const data = emptyData()
  const now = new Date().toISOString()
  const uid = DEMO_USER_ID

  data.profiles[uid] = {
    id: uid,
    displayName: 'אורח/ת',
    goalText: 'להרגיש טוב יותר ולשמור על שגרה מאוזנת',
    eatingPreferences: 'ים תיכוני, לא צמחוני',
    dislikedFoods: 'פטריות',
    allergies: '',
    startingWeightKg: 78,
    waterGoalMl: 2000,
    activityGoalMinutes: 30,
    onboardingCompleted: true,
    createdAt: now,
    updatedAt: now,
  }

  const planId = newId()
  data.mealPlans[planId] = {
    id: planId,
    userId: uid,
    title: 'התוכנית השבועית שלי',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }

  const plannedSeed: Array<[number, PlannedMeal['mealType'], string, { foodName: string; quantity: number; unit: string }[]]> = [
    [0, 'breakfast', 'שייק בוקר', [{ foodName: 'יוגורט טבעי', quantity: 200, unit: 'גרם' }, { foodName: 'בננה', quantity: 1, unit: 'יחידה' }]],
    [0, 'lunch', 'סלט עוף', [{ foodName: 'חזה עוף בגריל', quantity: 150, unit: 'גרם' }, { foodName: 'סלט ירקות', quantity: 1, unit: 'קערה' }]],
    [1, 'breakfast', 'ביצים וטוסט', [{ foodName: 'ביצה', quantity: 2, unit: 'יחידה' }, { foodName: 'לחם מלא', quantity: 2, unit: 'פרוסות' }]],
  ]
  plannedSeed.forEach(([dayOfWeek, mealType, name, items], idx) => {
    const id = newId()
    data.plannedMeals[id] = {
      id,
      planId,
      userId: uid,
      dayOfWeek,
      mealType,
      name,
      items,
      note: null,
      position: idx,
      createdAt: now,
      updatedAt: now,
    }
  })

  const today = todayKey()
  const yesterday = addDays(today, -1)

  const meal1Id = newId()
  data.meals[meal1Id] = {
    id: meal1Id,
    userId: uid,
    mealDate: yesterday,
    mealTime: '08:15',
    mealType: 'breakfast',
    note: null,
    photoPath: null,
    sourcePlannedMealId: null,
    items: [
      { id: newId(), foodName: 'יוגורט טבעי', quantity: 200, unit: 'גרם', position: 0 },
      { id: newId(), foodName: 'גרנולה', quantity: 40, unit: 'גרם', position: 1 },
    ],
    createdAt: now,
    updatedAt: now,
  }

  const meal2Id = newId()
  data.meals[meal2Id] = {
    id: meal2Id,
    userId: uid,
    mealDate: yesterday,
    mealTime: '13:30',
    mealType: 'lunch',
    note: 'ארוחה במסעדה',
    photoPath: null,
    sourcePlannedMealId: null,
    items: [
      { id: newId(), foodName: 'סלמון בתנור', quantity: 180, unit: 'גרם', position: 0 },
      { id: newId(), foodName: 'אורז מלא', quantity: 150, unit: 'גרם', position: 1 },
    ],
    createdAt: now,
    updatedAt: now,
  }

  data.waterLogs[newId()] = { id: newId(), userId: uid, logDate: yesterday, amountMl: 500, loggedAt: now }
  data.waterLogs[newId()] = { id: newId(), userId: uid, logDate: yesterday, amountMl: 750, loggedAt: now }
  data.activityLogs[newId()] = { id: newId(), userId: uid, logDate: yesterday, activityType: 'הליכה', durationMinutes: 35, note: null, loggedAt: now }

  const w1 = newId()
  data.weightLogs[w1] = { id: w1, userId: uid, logDate: addDays(today, -7), weightKg: 79.2, note: null, createdAt: now }
  const w2 = newId()
  data.weightLogs[w2] = { id: w2, userId: uid, logDate: yesterday, weightKg: 78.4, note: null, createdAt: now }

  return data
}

function load(): DemoData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = seedData()
      save(seeded)
      return seeded
    }
    const parsed = JSON.parse(raw) as DemoData
    if (!parsed.userFoods) parsed.userFoods = {}
    if (!parsed.userFoodUnits) parsed.userFoodUnits = {}
    return parsed
  } catch {
    return seedData()
  }
}

function save(data: DemoData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage may be unavailable (private mode) - fail silently, state stays in-memory for this session
  }
}

let cache: DemoData | null = null

export function getDemoData(): DemoData {
  if (!cache) cache = load()
  return cache
}

export function mutateDemoData<T>(fn: (data: DemoData) => T): T {
  const data = getDemoData()
  const result = fn(data)
  save(data)
  return result
}

export function resetDemoData() {
  cache = seedData()
  save(cache)
}

export function isDemoSessionActive(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function setDemoSessionActive(active: boolean) {
  try {
    if (active) localStorage.setItem(SESSION_KEY, '1')
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}
