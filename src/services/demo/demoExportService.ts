import type { ExportService } from '../types'
import { getDemoData } from './demoStore'

export const demoExportService: ExportService = {
  async exportAllData(userId) {
    const data = getDemoData()
    return {
      mode: 'demo',
      exportedAt: new Date().toISOString(),
      profile: data.profiles[userId] ?? null,
      meals: Object.values(data.meals).filter((m) => m.userId === userId),
      waterLogs: Object.values(data.waterLogs).filter((w) => w.userId === userId),
      activityLogs: Object.values(data.activityLogs).filter((a) => a.userId === userId),
      weightLogs: Object.values(data.weightLogs).filter((w) => w.userId === userId),
      mealPlans: Object.values(data.mealPlans).filter((p) => p.userId === userId),
      plannedMeals: Object.values(data.plannedMeals).filter((p) => p.userId === userId),
      favoriteMeals: Object.values(data.favoriteMeals).filter((f) => f.userId === userId),
    }
  },
}
