import { supabase } from '@/lib/supabaseClient'
import type { LogsService } from '../types'
import { mapActivityLog, mapWaterLog, mapWeightLog } from './mappers'

export const supabaseLogsService: LogsService = {
  async listWaterForDate(userId, date) {
    const { data, error } = await supabase!.from('water_logs').select('*').eq('user_id', userId).eq('log_date', date).order('logged_at')
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapWaterLog)
  },

  async addWater(userId, date, amountMl) {
    const { data, error } = await supabase!.from('water_logs').insert({ user_id: userId, log_date: date, amount_ml: amountMl }).select('*').single()
    if (error) throw new Error(error.message)
    return mapWaterLog(data)
  },

  async deleteWater(userId, id) {
    const { error } = await supabase!.from('water_logs').delete().eq('id', id).eq('user_id', userId)
    if (error) throw new Error(error.message)
  },

  async listActivityForDate(userId, date) {
    const { data, error } = await supabase!.from('activity_logs').select('*').eq('user_id', userId).eq('log_date', date).order('logged_at')
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapActivityLog)
  },

  async addActivity(userId, date, activityType, durationMinutes, note) {
    const { data, error } = await supabase!
      .from('activity_logs')
      .insert({ user_id: userId, log_date: date, activity_type: activityType, duration_minutes: durationMinutes, note })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapActivityLog(data)
  },

  async deleteActivity(userId, id) {
    const { error } = await supabase!.from('activity_logs').delete().eq('id', id).eq('user_id', userId)
    if (error) throw new Error(error.message)
  },

  async listWeightInRange(userId, startDate, endDate) {
    const { data, error } = await supabase!
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date')
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapWeightLog)
  },

  async getLatestWeight(userId) {
    const { data, error } = await supabase!.from('weight_logs').select('*').eq('user_id', userId).order('log_date', { ascending: false }).limit(1).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? mapWeightLog(data) : null
  },

  async upsertWeight(userId, date, weightKg, note) {
    const { data, error } = await supabase!
      .from('weight_logs')
      .upsert({ user_id: userId, log_date: date, weight_kg: weightKg, note }, { onConflict: 'user_id,log_date' })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapWeightLog(data)
  },

  async listWaterInRange(userId, startDate, endDate) {
    const { data, error } = await supabase!.from('water_logs').select('*').eq('user_id', userId).gte('log_date', startDate).lte('log_date', endDate)
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapWaterLog)
  },

  async listActivityInRange(userId, startDate, endDate) {
    const { data, error } = await supabase!.from('activity_logs').select('*').eq('user_id', userId).gte('log_date', startDate).lte('log_date', endDate)
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapActivityLog)
  },
}
