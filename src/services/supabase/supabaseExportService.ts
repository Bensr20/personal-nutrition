import { supabase } from '@/lib/supabaseClient'
import type { ExportService } from '../types'

export const supabaseExportService: ExportService = {
  async exportAllData(userId) {
    const [profile, meals, water, activity, weight, plans, planned, favorites] = await Promise.all([
      supabase!.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase!.from('meals').select('*, meal_items(*)').eq('user_id', userId),
      supabase!.from('water_logs').select('*').eq('user_id', userId),
      supabase!.from('activity_logs').select('*').eq('user_id', userId),
      supabase!.from('weight_logs').select('*').eq('user_id', userId),
      supabase!.from('meal_plans').select('*').eq('user_id', userId),
      supabase!.from('planned_meals').select('*').eq('user_id', userId),
      supabase!.from('favorite_meals').select('*').eq('user_id', userId),
    ])

    return {
      mode: 'live',
      exportedAt: new Date().toISOString(),
      profile: profile.data ?? null,
      meals: meals.data ?? [],
      waterLogs: water.data ?? [],
      activityLogs: activity.data ?? [],
      weightLogs: weight.data ?? [],
      mealPlans: plans.data ?? [],
      plannedMeals: planned.data ?? [],
      favoriteMeals: favorites.data ?? [],
    }
  },
}
