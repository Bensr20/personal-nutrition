import type { ActivityLog, FavoriteMeal, FoodSource, Meal, MealItem, MealPlan, PlannedMeal, Profile, WaterLog, WeightLog } from '@/types/domain'

export function mapProfile(row: any): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    goalText: row.goal_text,
    eatingPreferences: row.eating_preferences,
    dislikedFoods: row.disliked_foods,
    allergies: row.allergies,
    startingWeightKg: row.starting_weight_kg,
    waterGoalMl: row.water_goal_ml,
    activityGoalMinutes: row.activity_goal_minutes,
    onboardingCompleted: row.onboarding_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapMealItem(row: any): MealItem {
  const hasNutrition = row.kcal != null || row.protein_g != null || row.carbs_g != null || row.fat_g != null || row.is_partial
  return {
    id: row.id,
    foodName: row.food_name,
    quantity: Number(row.quantity),
    unit: row.unit,
    position: row.position,
    foodRef: row.food_source
      ? {
          source: row.food_source as FoodSource,
          sourceId: row.food_source_id,
          brand: row.food_brand,
          barcode: row.food_barcode,
        }
      : null,
    unitCode: row.unit_code,
    amountGrams: row.amount_grams == null ? null : Number(row.amount_grams),
    nutrition: hasNutrition
      ? {
          kcal: row.kcal == null ? null : Number(row.kcal),
          proteinG: row.protein_g == null ? null : Number(row.protein_g),
          carbsG: row.carbs_g == null ? null : Number(row.carbs_g),
          fatG: row.fat_g == null ? null : Number(row.fat_g),
          isPartial: Boolean(row.is_partial),
        }
      : null,
  }
}

export function mapMeal(row: any): Meal {
  const items = Array.isArray(row.meal_items) ? [...row.meal_items].sort((a, b) => a.position - b.position).map(mapMealItem) : []
  return {
    id: row.id,
    userId: row.user_id,
    mealDate: row.meal_date,
    mealTime: row.meal_time,
    mealType: row.meal_type,
    note: row.note,
    photoPath: row.photo_path,
    sourcePlannedMealId: row.source_planned_meal_id,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapWaterLog(row: any): WaterLog {
  return { id: row.id, userId: row.user_id, logDate: row.log_date, amountMl: row.amount_ml, loggedAt: row.logged_at }
}

export function mapActivityLog(row: any): ActivityLog {
  return {
    id: row.id,
    userId: row.user_id,
    logDate: row.log_date,
    activityType: row.activity_type,
    durationMinutes: row.duration_minutes,
    note: row.note,
    loggedAt: row.logged_at,
  }
}

export function mapWeightLog(row: any): WeightLog {
  return { id: row.id, userId: row.user_id, logDate: row.log_date, weightKg: Number(row.weight_kg), note: row.note, createdAt: row.created_at }
}

export function mapMealPlan(row: any): MealPlan {
  return { id: row.id, userId: row.user_id, title: row.title, isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at }
}

export function mapPlannedMeal(row: any): PlannedMeal {
  return {
    id: row.id,
    planId: row.plan_id,
    userId: row.user_id,
    dayOfWeek: row.day_of_week,
    mealType: row.meal_type,
    name: row.name,
    items: row.items ?? [],
    note: row.note,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapFavoriteMeal(row: any): FavoriteMeal {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    mealType: row.meal_type,
    items: row.items ?? [],
    note: row.note,
    createdAt: row.created_at,
  }
}
