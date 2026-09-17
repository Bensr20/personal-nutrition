import { supabase } from '@/lib/supabaseClient'
import { FoodCatalogIndex } from './foodCatalogIndex'
import type { FoodCatalogItem, FoodCatalogService, FoodUnitOption } from './foodTypes'

const CACHE_KEY = 'personal-nutrition:food-catalog-cache:v1'

let indexPromise: Promise<FoodCatalogIndex> | null = null

function rowToItem(row: any, units: FoodUnitOption[]): FoodCatalogItem {
  return {
    id: `${row.source}:${row.source_id}`,
    source: row.source,
    sourceId: row.source_id,
    originalName: row.original_name,
    displayNameHe: row.display_name_he,
    englishName: row.english_name,
    brand: row.brand,
    barcode: row.barcode,
    imageUrl: row.image_url ?? null,
    per100: {
      kcal: row.kcal_per_100 == null ? null : Number(row.kcal_per_100),
      proteinG: row.protein_g_per_100 == null ? null : Number(row.protein_g_per_100),
      carbsG: row.carbs_g_per_100 == null ? null : Number(row.carbs_g_per_100),
      fatG: row.fat_g_per_100 == null ? null : Number(row.fat_g_per_100),
    },
    baseUnit: row.base_unit,
    units,
    fetchedAt: row.fetched_at,
    sourceUpdatedAt: row.source_updated_at,
    verified: row.verified,
  }
}

const PAGE_SIZE = 1000

/**
 * PostgREST מגביל תגובת select רגילה ל-1000 שורות כברירת מחדל (נבדק בפועל מול הפרויקט) —
 * select('*') בלי pagination היה מחזיר רק חלק מהקטלוג בשקט. עימוד עם .range() עד שדף חוזר
 * קצר מ-PAGE_SIZE מבטיח שליפת כל הרשומות.
 */
async function fetchAllRows(table: string): Promise<any[]> {
  const rows: any[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase!.from(table).select('*').range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`טעינת ${table} מ-Supabase נכשלה: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

async function loadFromSupabase(): Promise<FoodCatalogItem[]> {
  const [foodRows, unitRows] = await Promise.all([fetchAllRows('foods'), fetchAllRows('food_units')])

  const unitsByFoodId = new Map<string, FoodUnitOption[]>()
  for (const u of unitRows ?? []) {
    if (!unitsByFoodId.has(u.food_id)) unitsByFoodId.set(u.food_id, [])
    unitsByFoodId.get(u.food_id)!.push({ code: u.unit_code, labelHe: u.label_he, grams: Number(u.grams) })
  }

  return (foodRows ?? []).map((row) => rowToItem(row, unitsByFoodId.get(row.id) ?? []))
}

function userRowToItem(row: any): FoodCatalogItem {
  return rowToItem(
    {
      source: 'user',
      source_id: row.id,
      original_name: row.display_name,
      display_name_he: row.display_name,
      english_name: null,
      brand: row.brand,
      barcode: row.barcode,
      kcal_per_100: row.kcal_per_100,
      protein_g_per_100: row.protein_g_per_100,
      carbs_g_per_100: row.carbs_g_per_100,
      fat_g_per_100: row.fat_g_per_100,
      base_unit: 'g',
      fetched_at: row.created_at,
      source_updated_at: null,
      verified: false,
    },
    [],
  )
}

async function getIndex(): Promise<FoodCatalogIndex> {
  if (!indexPromise) {
    indexPromise = (async () => {
      const idx = new FoodCatalogIndex()
      try {
        const items = await loadFromSupabase()
        idx.setItems(items)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ cachedAt: new Date().toISOString(), items }))
        } catch {
          // localStorage לא זמין - ממשיכים בלי קאש מקומי
        }
      } catch (err) {
        // נפילת רשת/DB: ניסיון חזרה לקאש מקומי כדי שהחיפוש ימשיך לעבוד
        try {
          const raw = localStorage.getItem(CACHE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw) as { items: FoodCatalogItem[] }
            idx.setItems(parsed.items)
            return idx
          }
        } catch {
          // אין קאש זמין - ממשיכים עם אינדקס ריק
        }
        throw err
      }
      return idx
    })()
  }
  return indexPromise
}

export const supabaseFoodCatalogService: FoodCatalogService = {
  async search(_userId, query, limit = 20) {
    const idx = await getIndex()
    return idx.search(query, limit)
  },

  async getById(userId, id) {
    if (id.startsWith('user:')) {
      const sourceId = id.slice('user:'.length)
      const { data, error } = await supabase!.from('user_foods').select('*').eq('id', sourceId).eq('user_id', userId).maybeSingle()
      if (error || !data) return null
      return userRowToItem(data)
    }
    const idx = await getIndex()
    return idx.getById(id)
  },

  async count() {
    const idx = await getIndex()
    return idx.count()
  },

  async addUserFood(userId, input) {
    const { data, error } = await supabase!
      .from('user_foods')
      .insert({
        user_id: userId,
        display_name: input.displayName,
        brand: input.brand,
        barcode: input.barcode,
        kcal_per_100: input.kcalPer100,
        protein_g_per_100: input.proteinPer100,
        carbs_g_per_100: input.carbsPer100,
        fat_g_per_100: input.fatPer100,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return userRowToItem(data)
  },

  async listUserFoods(userId) {
    const { data, error } = await supabase!.from('user_foods').select('*').eq('user_id', userId)
    if (error) throw new Error(error.message)
    return (data ?? []).map(userRowToItem)
  },

  async findUserFoodByBarcode(userId, barcode) {
    const { data, error } = await supabase!.from('user_foods').select('*').eq('user_id', userId).eq('barcode', barcode).maybeSingle()
    if (error || !data) return null
    return userRowToItem(data)
  },

  async listUserFoodUnits(userId, source, sourceId) {
    const { data, error } = await supabase!
      .from('user_food_units')
      .select('*')
      .eq('user_id', userId)
      .eq('food_source', source)
      .eq('food_source_id', sourceId)
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => ({ id: row.id, label: row.label, grams: Number(row.grams) }))
  },

  async saveUserFoodUnit(userId, source, sourceId, label, grams) {
    // upsert על אותו אילוץ ייחודיות: שמירה חוזרת עם אותו שם ("הקערה שלי") מעדכנת את המשקל
    // במקום ליצור כפילות, כך שאפשר לתקן טעות בלי למחוק ולהוסיף מחדש.
    const { data, error } = await supabase!
      .from('user_food_units')
      .upsert(
        { user_id: userId, food_source: source, food_source_id: sourceId, label, grams },
        { onConflict: 'user_id,food_source,food_source_id,label' },
      )
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return { id: data.id, label: data.label, grams: Number(data.grams) }
  },
}
