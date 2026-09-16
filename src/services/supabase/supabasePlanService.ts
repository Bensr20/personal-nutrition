import { supabase } from '@/lib/supabaseClient'
import type { PlanService } from '../types'
import { mapMeal, mapMealPlan, mapPlannedMeal } from './mappers'

export const supabasePlanService: PlanService = {
  async getActivePlan(userId) {
    const { data, error } = await supabase!.from('meal_plans').select('*').eq('user_id', userId).maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return mapMealPlan(data)

    // upsert עם ignoreDuplicates (ON CONFLICT DO NOTHING) על אילוץ הייחודיות ב-user_id: אם קריאה
    // מקבילה כבר יצרה את התוכנית בין ה-select לכאן, האינסרט הזה לא כותב כלום ולא דורס כותרת קיימת.
    const { data: created, error: createErr } = await supabase!
      .from('meal_plans')
      .upsert({ user_id: userId, title: 'התוכנית שלי', is_active: true }, { onConflict: 'user_id', ignoreDuplicates: true })
      .select('*')
    if (createErr) throw new Error(createErr.message)
    if (created && created.length > 0) return mapMealPlan(created[0])

    // הפסדנו במרוץ - קריאה מקבילה כבר יצרה את התוכנית, שולפים אותה
    const { data: existing, error: existingErr } = await supabase!.from('meal_plans').select('*').eq('user_id', userId).single()
    if (existingErr) throw new Error(existingErr.message)
    return mapMealPlan(existing)
  },

  async listPlannedMeals(userId, planId) {
    const { data, error } = await supabase!
      .from('planned_meals')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .order('day_of_week')
      .order('position')
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapPlannedMeal)
  },

  async createPlannedMeal(userId, planId, input) {
    const { data: siblings, error: sibErr } = await supabase!
      .from('planned_meals')
      .select('id')
      .eq('plan_id', planId)
      .eq('day_of_week', input.dayOfWeek)
    if (sibErr) throw new Error(sibErr.message)

    const { data, error } = await supabase!
      .from('planned_meals')
      .insert({
        plan_id: planId,
        user_id: userId,
        day_of_week: input.dayOfWeek,
        meal_type: input.mealType,
        name: input.name,
        items: input.items,
        note: input.note,
        position: siblings?.length ?? 0,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapPlannedMeal(data)
  },

  async updatePlannedMeal(userId, id, patch) {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.dayOfWeek !== undefined) payload.day_of_week = patch.dayOfWeek
    if (patch.mealType !== undefined) payload.meal_type = patch.mealType
    if (patch.name !== undefined) payload.name = patch.name
    if (patch.items !== undefined) payload.items = patch.items
    if (patch.note !== undefined) payload.note = patch.note
    if (patch.position !== undefined) payload.position = patch.position

    const { data, error } = await supabase!.from('planned_meals').update(payload).eq('id', id).eq('user_id', userId).select('*').single()
    if (error) throw new Error(error.message)
    return mapPlannedMeal(data)
  },

  async deletePlannedMeal(userId, id) {
    const { error } = await supabase!.from('planned_meals').delete().eq('id', id).eq('user_id', userId)
    if (error) throw new Error(error.message)
  },

  async copyDay(userId, planId, fromDay, toDay) {
    const { data: source, error } = await supabase!
      .from('planned_meals')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .eq('day_of_week', fromDay)
      .order('position')
    if (error) throw new Error(error.message)

    const { error: delErr } = await supabase!.from('planned_meals').delete().eq('plan_id', planId).eq('user_id', userId).eq('day_of_week', toDay)
    if (delErr) throw new Error(delErr.message)

    if (!source || source.length === 0) return []

    const rows = source.map((s: any, i: number) => ({
      plan_id: planId,
      user_id: userId,
      day_of_week: toDay,
      meal_type: s.meal_type,
      name: s.name,
      items: s.items,
      note: s.note,
      position: i,
    }))
    const { data: created, error: insErr } = await supabase!.from('planned_meals').insert(rows).select('*')
    if (insErr) throw new Error(insErr.message)
    return (created ?? []).map(mapPlannedMeal)
  },

  async moveToJournal(userId, plannedMeal, targetDate) {
    const { data: existing, error: existingErr } = await supabase!
      .from('meals')
      .select('*, meal_items(*)')
      .eq('user_id', userId)
      .eq('meal_date', targetDate)
      .eq('source_planned_meal_id', plannedMeal.id)
      .maybeSingle()
    if (existingErr) throw new Error(existingErr.message)
    if (existing) return mapMeal(existing)

    const { data, error } = await supabase!
      .from('meals')
      .insert({
        user_id: userId,
        meal_date: targetDate,
        meal_type: plannedMeal.mealType,
        note: plannedMeal.note,
        source_planned_meal_id: plannedMeal.id,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    if (plannedMeal.items.length > 0) {
      const rows = plannedMeal.items.map((it, i) => ({
        meal_id: data.id,
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
      const { error: itemsErr } = await supabase!.from('meal_items').insert(rows)
      if (itemsErr) throw new Error(itemsErr.message)
    }

    const { data: full, error: fullErr } = await supabase!.from('meals').select('*, meal_items(*)').eq('id', data.id).single()
    if (fullErr) throw new Error(fullErr.message)
    return mapMeal(full)
  },
}
