import { supabase } from '@/lib/supabaseClient'
import type { ProfileService } from '../types'
import { mapProfile } from './mappers'

export const supabaseProfileService: ProfileService = {
  async getProfile(userId) {
    const { data, error } = await supabase!.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? mapProfile(data) : null
  },

  async completeOnboarding(userId, input) {
    const { data, error } = await supabase!
      .from('profiles')
      .upsert({
        id: userId,
        display_name: input.displayName,
        goal_text: input.goalText || null,
        eating_preferences: input.eatingPreferences || null,
        disliked_foods: input.dislikedFoods || null,
        allergies: input.allergies || null,
        starting_weight_kg: input.startingWeightKg,
        water_goal_ml: input.waterGoalMl,
        activity_goal_minutes: input.activityGoalMinutes,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapProfile(data)
  },

  async updateProfile(userId, patch) {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.displayName !== undefined) payload.display_name = patch.displayName
    if (patch.goalText !== undefined) payload.goal_text = patch.goalText || null
    if (patch.eatingPreferences !== undefined) payload.eating_preferences = patch.eatingPreferences || null
    if (patch.dislikedFoods !== undefined) payload.disliked_foods = patch.dislikedFoods || null
    if (patch.allergies !== undefined) payload.allergies = patch.allergies || null
    if (patch.startingWeightKg !== undefined) payload.starting_weight_kg = patch.startingWeightKg
    if (patch.waterGoalMl !== undefined) payload.water_goal_ml = patch.waterGoalMl
    if (patch.activityGoalMinutes !== undefined) payload.activity_goal_minutes = patch.activityGoalMinutes

    const { data, error } = await supabase!.from('profiles').update(payload).eq('id', userId).select('*').single()
    if (error) throw new Error(error.message)
    return mapProfile(data)
  },
}
