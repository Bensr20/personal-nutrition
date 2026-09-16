import { newId } from '@/lib/id'
import type { LogsService } from '../types'
import { mutateDemoData } from './demoStore'

export const demoLogsService: LogsService = {
  async listWaterForDate(userId, date) {
    return mutateDemoData((data) =>
      Object.values(data.waterLogs).filter((w) => w.userId === userId && w.logDate === date).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)),
    )
  },

  async addWater(userId, date, amountMl) {
    return mutateDemoData((data) => {
      const id = newId()
      const log = { id, userId, logDate: date, amountMl, loggedAt: new Date().toISOString() }
      data.waterLogs[id] = log
      return log
    })
  },

  async deleteWater(userId, id) {
    mutateDemoData((data) => {
      const existing = data.waterLogs[id]
      if (existing && existing.userId === userId) delete data.waterLogs[id]
    })
  },

  async listActivityForDate(userId, date) {
    return mutateDemoData((data) =>
      Object.values(data.activityLogs).filter((a) => a.userId === userId && a.logDate === date).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)),
    )
  },

  async addActivity(userId, date, activityType, durationMinutes, note) {
    return mutateDemoData((data) => {
      const id = newId()
      const log = { id, userId, logDate: date, activityType, durationMinutes, note, loggedAt: new Date().toISOString() }
      data.activityLogs[id] = log
      return log
    })
  },

  async deleteActivity(userId, id) {
    mutateDemoData((data) => {
      const existing = data.activityLogs[id]
      if (existing && existing.userId === userId) delete data.activityLogs[id]
    })
  },

  async listWeightInRange(userId, startDate, endDate) {
    return mutateDemoData((data) =>
      Object.values(data.weightLogs)
        .filter((w) => w.userId === userId && w.logDate >= startDate && w.logDate <= endDate)
        .sort((a, b) => a.logDate.localeCompare(b.logDate)),
    )
  },

  async getLatestWeight(userId) {
    return mutateDemoData((data) => {
      const all = Object.values(data.weightLogs)
        .filter((w) => w.userId === userId)
        .sort((a, b) => b.logDate.localeCompare(a.logDate))
      return all[0] ?? null
    })
  },

  async upsertWeight(userId, date, weightKg, note) {
    return mutateDemoData((data) => {
      const existing = Object.values(data.weightLogs).find((w) => w.userId === userId && w.logDate === date)
      if (existing) {
        existing.weightKg = weightKg
        existing.note = note
        return existing
      }
      const id = newId()
      const log = { id, userId, logDate: date, weightKg, note, createdAt: new Date().toISOString() }
      data.weightLogs[id] = log
      return log
    })
  },

  async listWaterInRange(userId, startDate, endDate) {
    return mutateDemoData((data) =>
      Object.values(data.waterLogs).filter((w) => w.userId === userId && w.logDate >= startDate && w.logDate <= endDate),
    )
  },

  async listActivityInRange(userId, startDate, endDate) {
    return mutateDemoData((data) =>
      Object.values(data.activityLogs).filter((a) => a.userId === userId && a.logDate >= startDate && a.logDate <= endDate),
    )
  },
}
