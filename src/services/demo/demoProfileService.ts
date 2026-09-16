import type { OnboardingInput, Profile } from '@/types/domain'
import type { ProfileService } from '../types'
import { mutateDemoData } from './demoStore'

export const demoProfileService: ProfileService = {
  async getProfile(userId) {
    return mutateDemoData((data) => data.profiles[userId] ?? null)
  },

  async completeOnboarding(userId, input) {
    return mutateDemoData((data) => {
      const now = new Date().toISOString()
      const profile: Profile = {
        id: userId,
        displayName: input.displayName,
        goalText: input.goalText || null,
        eatingPreferences: input.eatingPreferences || null,
        dislikedFoods: input.dislikedFoods || null,
        allergies: input.allergies || null,
        startingWeightKg: input.startingWeightKg,
        waterGoalMl: input.waterGoalMl,
        activityGoalMinutes: input.activityGoalMinutes,
        onboardingCompleted: true,
        createdAt: data.profiles[userId]?.createdAt ?? now,
        updatedAt: now,
      }
      data.profiles[userId] = profile
      return profile
    })
  },

  async updateProfile(userId, patch) {
    return mutateDemoData((data) => {
      const existing = data.profiles[userId]
      if (!existing) throw new Error('פרופיל לא נמצא')
      const updated: Profile = {
        ...existing,
        displayName: patch.displayName ?? existing.displayName,
        goalText: patch.goalText ?? existing.goalText,
        eatingPreferences: patch.eatingPreferences ?? existing.eatingPreferences,
        dislikedFoods: patch.dislikedFoods ?? existing.dislikedFoods,
        allergies: patch.allergies ?? existing.allergies,
        startingWeightKg: patch.startingWeightKg ?? existing.startingWeightKg,
        waterGoalMl: patch.waterGoalMl ?? existing.waterGoalMl,
        activityGoalMinutes: patch.activityGoalMinutes ?? existing.activityGoalMinutes,
        updatedAt: new Date().toISOString(),
      }
      data.profiles[userId] = updated
      return updated
    })
  },
}
