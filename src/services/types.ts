import type {
  ActivityLog,
  FavoriteMeal,
  Meal,
  MealInput,
  MealPlan,
  OnboardingInput,
  PlannedMeal,
  Profile,
  WaterLog,
  WeightLog,
} from '@/types/domain'

export interface AuthUser {
  id: string
  email: string | null
}

export interface AuthService {
  getSession(): Promise<AuthUser | null>
  onAuthChange(cb: (user: AuthUser | null) => void): () => void
  signInWithPassword(email: string, password: string): Promise<{ error: string | null }>
  signUp(email: string, password: string): Promise<{ error: string | null }>
  signOut(): Promise<void>
  isDemo: boolean
}

export interface ProfileService {
  getProfile(userId: string): Promise<Profile | null>
  completeOnboarding(userId: string, input: OnboardingInput): Promise<Profile>
  updateProfile(userId: string, patch: Partial<OnboardingInput>): Promise<Profile>
}

export interface MealsService {
  listMealsForDate(userId: string, date: string): Promise<Meal[]>
  listMealsInRange(userId: string, startDate: string, endDate: string): Promise<Meal[]>
  createMeal(userId: string, input: MealInput): Promise<Meal>
  updateMeal(userId: string, mealId: string, input: MealInput): Promise<Meal>
  deleteMeal(userId: string, mealId: string): Promise<void>
  duplicateMealToDate(userId: string, mealId: string, targetDate: string): Promise<Meal>
  attachPhoto(userId: string, mealId: string, file: File): Promise<Meal>
  getPhotoUrl(userId: string, photoPath: string): Promise<string | null>
}

export interface LogsService {
  listWaterForDate(userId: string, date: string): Promise<WaterLog[]>
  addWater(userId: string, date: string, amountMl: number): Promise<WaterLog>
  deleteWater(userId: string, id: string): Promise<void>

  listActivityForDate(userId: string, date: string): Promise<ActivityLog[]>
  addActivity(userId: string, date: string, activityType: string, durationMinutes: number, note: string | null): Promise<ActivityLog>
  deleteActivity(userId: string, id: string): Promise<void>

  listWeightInRange(userId: string, startDate: string, endDate: string): Promise<WeightLog[]>
  getLatestWeight(userId: string): Promise<WeightLog | null>
  upsertWeight(userId: string, date: string, weightKg: number, note: string | null): Promise<WeightLog>

  listWaterInRange(userId: string, startDate: string, endDate: string): Promise<WaterLog[]>
  listActivityInRange(userId: string, startDate: string, endDate: string): Promise<ActivityLog[]>
}

export interface PlanService {
  getActivePlan(userId: string): Promise<MealPlan>
  listPlannedMeals(userId: string, planId: string): Promise<PlannedMeal[]>
  createPlannedMeal(userId: string, planId: string, input: Omit<PlannedMeal, 'id' | 'planId' | 'userId' | 'createdAt' | 'updatedAt' | 'position'>): Promise<PlannedMeal>
  updatePlannedMeal(userId: string, id: string, patch: Partial<Omit<PlannedMeal, 'id' | 'planId' | 'userId'>>): Promise<PlannedMeal>
  deletePlannedMeal(userId: string, id: string): Promise<void>
  copyDay(userId: string, planId: string, fromDay: number, toDay: number): Promise<PlannedMeal[]>
  moveToJournal(userId: string, plannedMeal: PlannedMeal, targetDate: string): Promise<Meal>
}

export interface FavoritesService {
  listFavorites(userId: string): Promise<FavoriteMeal[]>
  addFavoriteFromMeal(userId: string, meal: Meal, name: string): Promise<FavoriteMeal>
  deleteFavorite(userId: string, id: string): Promise<void>
}

export interface ExportService {
  exportAllData(userId: string): Promise<Record<string, unknown>>
}
