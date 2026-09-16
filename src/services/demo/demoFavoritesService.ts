import { newId } from '@/lib/id'
import type { FavoritesService } from '../types'
import { mutateDemoData } from './demoStore'

export const demoFavoritesService: FavoritesService = {
  async listFavorites(userId) {
    return mutateDemoData((data) =>
      Object.values(data.favoriteMeals)
        .filter((f) => f.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    )
  },

  async addFavoriteFromMeal(userId, meal, name) {
    return mutateDemoData((data) => {
      const id = newId()
      const favorite = {
        id,
        userId,
        name,
        mealType: meal.mealType,
        items: meal.items.map((it) => ({
          foodName: it.foodName,
          quantity: it.quantity,
          unit: it.unit,
          foodRef: it.foodRef,
          unitCode: it.unitCode,
          amountGrams: it.amountGrams,
          nutrition: it.nutrition,
        })),
        note: meal.note,
        createdAt: new Date().toISOString(),
      }
      data.favoriteMeals[id] = favorite
      return favorite
    })
  },

  async createFavorite(userId, input) {
    return mutateDemoData((data) => {
      const id = newId()
      const favorite = {
        id,
        userId,
        name: input.name,
        mealType: input.mealType,
        items: input.items.map((it) => ({ ...it })),
        note: input.note,
        createdAt: new Date().toISOString(),
      }
      data.favoriteMeals[id] = favorite
      return favorite
    })
  },

  async deleteFavorite(userId, id) {
    mutateDemoData((data) => {
      const existing = data.favoriteMeals[id]
      if (existing && existing.userId === userId) delete data.favoriteMeals[id]
    })
  },
}
