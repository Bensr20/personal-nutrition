import { newId } from '@/lib/id'
import type { PlanService } from '../types'
import { mutateDemoData } from './demoStore'

export const demoPlanService: PlanService = {
  async getActivePlan(userId) {
    return mutateDemoData((data) => {
      let plan = Object.values(data.mealPlans).find((p) => p.userId === userId && p.isActive)
      if (!plan) {
        const id = newId()
        const now = new Date().toISOString()
        plan = { id, userId, title: 'התוכנית שלי', isActive: true, createdAt: now, updatedAt: now }
        data.mealPlans[id] = plan
      }
      return plan
    })
  },

  async listPlannedMeals(userId, planId) {
    return mutateDemoData((data) =>
      Object.values(data.plannedMeals)
        .filter((p) => p.userId === userId && p.planId === planId)
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.position - b.position),
    )
  },

  async createPlannedMeal(userId, planId, input) {
    return mutateDemoData((data) => {
      const id = newId()
      const now = new Date().toISOString()
      const siblingCount = Object.values(data.plannedMeals).filter(
        (p) => p.planId === planId && p.dayOfWeek === input.dayOfWeek,
      ).length
      const planned = { id, planId, userId, ...input, position: siblingCount, createdAt: now, updatedAt: now }
      data.plannedMeals[id] = planned
      return planned
    })
  },

  async updatePlannedMeal(userId, id, patch) {
    return mutateDemoData((data) => {
      const existing = data.plannedMeals[id]
      if (!existing || existing.userId !== userId) throw new Error('לא נמצא')
      const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() }
      data.plannedMeals[id] = updated
      return updated
    })
  },

  async deletePlannedMeal(userId, id) {
    mutateDemoData((data) => {
      const existing = data.plannedMeals[id]
      if (existing && existing.userId === userId) delete data.plannedMeals[id]
    })
  },

  async copyDay(userId, planId, fromDay, toDay) {
    return mutateDemoData((data) => {
      const source = Object.values(data.plannedMeals).filter(
        (p) => p.userId === userId && p.planId === planId && p.dayOfWeek === fromDay,
      )
      const existing = Object.values(data.plannedMeals).filter(
        (p) => p.userId === userId && p.planId === planId && p.dayOfWeek === toDay,
      )
      existing.forEach((p) => delete data.plannedMeals[p.id])
      const now = new Date().toISOString()
      const created = source.map((p, i) => {
        const id = newId()
        const copy = { ...p, id, dayOfWeek: toDay, position: i, createdAt: now, updatedAt: now }
        data.plannedMeals[id] = copy
        return copy
      })
      return created
    })
  },

  async moveToJournal(userId, plannedMeal, targetDate) {
    return mutateDemoData((data) => {
      const dup = Object.values(data.meals).find(
        (m) => m.userId === userId && m.mealDate === targetDate && m.sourcePlannedMealId === plannedMeal.id,
      )
      if (dup) return dup
      const id = newId()
      const now = new Date().toISOString()
      const meal = {
        id,
        userId,
        mealDate: targetDate,
        mealTime: null,
        mealType: plannedMeal.mealType,
        note: plannedMeal.note,
        photoPath: null,
        sourcePlannedMealId: plannedMeal.id,
        items: plannedMeal.items.map((it) => ({ ...it, id: newId(), position: 0 })),
        createdAt: now,
        updatedAt: now,
      }
      data.meals[id] = meal
      return meal
    })
  },
}
