import { supabase } from '@/lib/supabaseClient'
import type { FavoritesService } from '../types'
import { mapFavoriteMeal } from './mappers'

export const supabaseFavoritesService: FavoritesService = {
  async listFavorites(userId) {
    const { data, error } = await supabase!.from('favorite_meals').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapFavoriteMeal)
  },

  async addFavoriteFromMeal(userId, meal, name) {
    const { data, error } = await supabase!
      .from('favorite_meals')
      .insert({
        user_id: userId,
        name,
        meal_type: meal.mealType,
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
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapFavoriteMeal(data)
  },

  async deleteFavorite(userId, id) {
    const { error } = await supabase!.from('favorite_meals').delete().eq('id', id).eq('user_id', userId)
    if (error) throw new Error(error.message)
  },
}
