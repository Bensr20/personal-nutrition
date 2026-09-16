import { newId } from '@/lib/id'
import type { Meal, MealInput } from '@/types/domain'
import type { MealsService } from '../types'
import { mutateDemoData } from './demoStore'

const MAX_DEMO_PHOTO_BYTES = 4 * 1024 * 1024

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('קריאת הקובץ נכשלה'))
    reader.readAsDataURL(file)
  })
}

function toMeal(userId: string, id: string, input: MealInput, createdAt: string): Meal {
  return {
    id,
    userId,
    mealDate: input.mealDate,
    mealTime: input.mealTime,
    mealType: input.mealType,
    note: input.note,
    photoPath: null,
    sourcePlannedMealId: input.sourcePlannedMealId ?? null,
    items: input.items.map((item, i) => ({ ...item, id: newId(), position: i })),
    createdAt,
    updatedAt: new Date().toISOString(),
  }
}

export const demoMealsService: MealsService = {
  async listMealsForDate(userId, date) {
    return mutateDemoData((data) =>
      Object.values(data.meals)
        .filter((m) => m.userId === userId && m.mealDate === date)
        .sort((a, b) => (a.mealTime ?? '').localeCompare(b.mealTime ?? '')),
    )
  },

  async listMealsInRange(userId, startDate, endDate) {
    return mutateDemoData((data) =>
      Object.values(data.meals)
        .filter((m) => m.userId === userId && m.mealDate >= startDate && m.mealDate <= endDate)
        .sort((a, b) => a.mealDate.localeCompare(b.mealDate)),
    )
  },

  async createMeal(userId, input) {
    if (input.sourcePlannedMealId) {
      const dup = await mutateDemoData((data) =>
        Object.values(data.meals).find(
          (m) => m.userId === userId && m.mealDate === input.mealDate && m.sourcePlannedMealId === input.sourcePlannedMealId,
        ),
      )
      if (dup) return dup
    }
    return mutateDemoData((data) => {
      const id = newId()
      const now = new Date().toISOString()
      const meal = toMeal(userId, id, input, now)
      data.meals[id] = meal
      return meal
    })
  },

  async updateMeal(userId, mealId, input) {
    return mutateDemoData((data) => {
      const existing = data.meals[mealId]
      if (!existing || existing.userId !== userId) throw new Error('הארוחה לא נמצאה')
      const updated = toMeal(userId, mealId, input, existing.createdAt)
      updated.photoPath = existing.photoPath
      data.meals[mealId] = updated
      return updated
    })
  },

  async deleteMeal(userId, mealId) {
    mutateDemoData((data) => {
      const existing = data.meals[mealId]
      if (existing && existing.userId === userId) delete data.meals[mealId]
    })
  },

  async duplicateMealToDate(userId, mealId, targetDate) {
    return mutateDemoData((data) => {
      const existing = data.meals[mealId]
      if (!existing || existing.userId !== userId) throw new Error('הארוחה לא נמצאה')
      const id = newId()
      const now = new Date().toISOString()
      const meal: Meal = {
        ...existing,
        id,
        mealDate: targetDate,
        sourcePlannedMealId: null,
        photoPath: null,
        items: existing.items.map((it) => ({ ...it, id: newId() })),
        createdAt: now,
        updatedAt: now,
      }
      data.meals[id] = meal
      return meal
    })
  },

  async attachPhoto(_userId, mealId, file) {
    if (file.size > MAX_DEMO_PHOTO_BYTES) {
      throw new Error('התמונה גדולה מדי (מקסימום 4MB במצב הדגמה)')
    }
    const dataUrl = await fileToDataUrl(file)
    return mutateDemoData((data) => {
      const meal = data.meals[mealId]
      if (!meal) throw new Error('הארוחה לא נמצאה')
      // מצב הדגמה: התמונה נשמרת מקומית כ-data URL בדפדפן, ללא אחסון בענן
      meal.photoPath = dataUrl
      meal.updatedAt = new Date().toISOString()
      return meal
    })
  },

  async getPhotoUrl(_userId, photoPath) {
    return photoPath.startsWith('data:') ? photoPath : null
  },
}
