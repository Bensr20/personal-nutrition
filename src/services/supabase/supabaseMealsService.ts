import { supabase } from '@/lib/supabaseClient'
import type { MealItemInput } from '@/types/domain'
import type { MealsService } from '../types'
import { mapMeal } from './mappers'

const SELECT = '*, meal_items(*)'

async function insertItems(mealId: string, items: MealItemInput[]) {
  if (items.length === 0) return
  const rows = items.map((it, i) => ({
    meal_id: mealId,
    food_name: it.foodName,
    quantity: it.quantity,
    unit: it.unit,
    position: i,
    food_source: it.foodRef?.source ?? null,
    food_source_id: it.foodRef?.sourceId ?? null,
    food_brand: it.foodRef?.brand ?? null,
    food_barcode: it.foodRef?.barcode ?? null,
    unit_code: it.unitCode ?? null,
    amount_grams: it.amountGrams ?? null,
    kcal: it.nutrition?.kcal ?? null,
    protein_g: it.nutrition?.proteinG ?? null,
    carbs_g: it.nutrition?.carbsG ?? null,
    fat_g: it.nutrition?.fatG ?? null,
    is_partial: it.nutrition?.isPartial ?? false,
  }))
  const { error } = await supabase!.from('meal_items').insert(rows)
  if (error) throw new Error(error.message)
}

export const supabaseMealsService: MealsService = {
  async listMealsForDate(userId, date) {
    const { data, error } = await supabase!.from('meals').select(SELECT).eq('user_id', userId).eq('meal_date', date).order('meal_time', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapMeal)
  },

  async listMealsInRange(userId, startDate, endDate) {
    const { data, error } = await supabase!
      .from('meals')
      .select(SELECT)
      .eq('user_id', userId)
      .gte('meal_date', startDate)
      .lte('meal_date', endDate)
      .order('meal_date', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapMeal)
  },

  async createMeal(userId, input) {
    if (input.sourcePlannedMealId) {
      const { data: existing, error: existingErr } = await supabase!
        .from('meals')
        .select(SELECT)
        .eq('user_id', userId)
        .eq('meal_date', input.mealDate)
        .eq('source_planned_meal_id', input.sourcePlannedMealId)
        .maybeSingle()
      if (existingErr) throw new Error(existingErr.message)
      if (existing) return mapMeal(existing)
    }

    const { data, error } = await supabase!
      .from('meals')
      .insert({
        user_id: userId,
        meal_date: input.mealDate,
        meal_time: input.mealTime,
        meal_type: input.mealType,
        note: input.note,
        source_planned_meal_id: input.sourcePlannedMealId ?? null,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    await insertItems(data.id, input.items)

    const { data: full, error: fullErr } = await supabase!.from('meals').select(SELECT).eq('id', data.id).single()
    if (fullErr) throw new Error(fullErr.message)
    return mapMeal(full)
  },

  async updateMeal(userId, mealId, input) {
    const { error } = await supabase!
      .from('meals')
      .update({
        meal_date: input.mealDate,
        meal_time: input.mealTime,
        meal_type: input.mealType,
        note: input.note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mealId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)

    const { error: delErr } = await supabase!.from('meal_items').delete().eq('meal_id', mealId)
    if (delErr) throw new Error(delErr.message)
    await insertItems(mealId, input.items)

    const { data: full, error: fullErr } = await supabase!.from('meals').select(SELECT).eq('id', mealId).single()
    if (fullErr) throw new Error(fullErr.message)
    return mapMeal(full)
  },

  async deleteMeal(userId, mealId) {
    const { error } = await supabase!.from('meals').delete().eq('id', mealId).eq('user_id', userId)
    if (error) throw new Error(error.message)
  },

  async duplicateMealToDate(userId, mealId, targetDate) {
    const { data: source, error } = await supabase!.from('meals').select(SELECT).eq('id', mealId).eq('user_id', userId).single()
    if (error) throw new Error(error.message)
    const meal = mapMeal(source)
    return this.createMeal(userId, {
      mealDate: targetDate,
      mealTime: meal.mealTime,
      mealType: meal.mealType,
      note: meal.note,
      items: meal.items.map((it) => ({
        foodName: it.foodName,
        quantity: it.quantity,
        unit: it.unit,
        foodRef: it.foodRef,
        unitCode: it.unitCode,
        amountGrams: it.amountGrams,
        nutrition: it.nutrition,
      })),
    })
  },

  async attachPhoto(userId, mealId, file) {
    const path = `${userId}/${mealId}-${Date.now()}-${file.name}`
    const { error: uploadErr } = await supabase!.storage.from('meal-photos').upload(path, file, { upsert: false })
    if (uploadErr) throw new Error(uploadErr.message)

    const { error } = await supabase!.from('meals').update({ photo_path: path, updated_at: new Date().toISOString() }).eq('id', mealId).eq('user_id', userId)
    if (error) throw new Error(error.message)

    const { data: full, error: fullErr } = await supabase!.from('meals').select(SELECT).eq('id', mealId).single()
    if (fullErr) throw new Error(fullErr.message)
    return mapMeal(full)
  },

  async getPhotoUrl(_userId, photoPath) {
    const { data, error } = await supabase!.storage.from('meal-photos').createSignedUrl(photoPath, 60 * 10)
    if (error) return null
    return data.signedUrl
  },
}
