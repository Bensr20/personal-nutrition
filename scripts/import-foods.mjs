#!/usr/bin/env node
// ייבוא מאגר התזונה הלאומי הישראלי (data.gov.il) לקובץ JSON מקומי המשולב באפליקציה,
// ובנוסף upsert לטבלת foods/food_units ב-Supabase כאשר מוגדרים משתני סביבה של service role.
//
// שימוש:
//   node scripts/import-foods.mjs
//
// משתני סביבה אופציונליים (לביצוע upsert אמיתי ל-Supabase; ללא הם רק נכתב קובץ JSON מקומי):
//   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_PATH = path.join(__dirname, '..', 'src', 'data', 'foodCatalogIsraeli.json')

const API_BASE = 'https://data.gov.il/api/3/action/'
const RESOURCE_FOODS = 'c3cb0630-0650-46c1-a068-82d575c094b2'
const RESOURCE_UNIT_NAMES = '98fb46fe-e8de-4067-94d2-b0a8ea4269da'
const RESOURCE_UNIT_WEIGHTS = '755d28c0-75f7-40e1-9c8c-ecdd106f9b2d'

const PAGE_SIZE = 1000

async function fetchAllRecords(resourceId, label) {
  const records = []
  let offset = 0
  let total = Infinity
  while (offset < total) {
    const url = `${API_BASE}datastore_search?resource_id=${resourceId}&limit=${PAGE_SIZE}&offset=${offset}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status} at offset ${offset}`)
    const body = await res.json()
    if (!body.success) throw new Error(`${label}: API returned success=false at offset ${offset}`)
    const page = body.result.records
    total = body.result.total
    records.push(...page)
    offset += PAGE_SIZE
    process.stdout.write(`\r${label}: ${Math.min(offset, total)}/${total}`)
    if (page.length === 0) break
  }
  process.stdout.write('\n')
  return records
}

function toNumberOrNull(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function parseIsraeliDate(s) {
  // פורמט: DD/MM/YYYY HH:mm:ss:SSS
  if (!s || typeof s !== 'string') return null
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  return `${yyyy}-${mm}-${dd}`
}

async function main() {
  console.log('מוריד מזונות, שמות מידות ומשקלי מידות ממאגר התזונה הלאומי...')
  const [foodRows, unitNameRows, unitWeightRows] = await Promise.all([
    fetchAllRecords(RESOURCE_FOODS, 'מזונות'),
    fetchAllRecords(RESOURCE_UNIT_NAMES, 'שמות מידות'),
    fetchAllRecords(RESOURCE_UNIT_WEIGHTS, 'משקלי מידות'),
  ])

  const unitNameByCode = new Map()
  for (const row of unitNameRows) {
    unitNameByCode.set(String(row.smlmida).trim(), String(row.shmmida).trim())
  }

  const unitsByFoodCode = new Map()
  for (const row of unitWeightRows) {
    const foodCode = String(row.mmitzrach).trim()
    const unitCode = String(row.mida).trim()
    const grams = toNumberOrNull(row.mishkal)
    if (grams == null || grams <= 0) continue
    const labelHe = unitNameByCode.get(unitCode) ?? unitCode
    if (!unitsByFoodCode.has(foodCode)) unitsByFoodCode.set(foodCode, [])
    unitsByFoodCode.get(foodCode).push({ code: unitCode, labelHe, grams })
  }

  const fetchedAt = new Date().toISOString()
  const items = []
  let skippedNoName = 0
  let skippedNoEnergy = 0

  for (const row of foodRows) {
    const code = String(row.Code).trim()
    const name = typeof row.shmmitzrach === 'string' ? row.shmmitzrach.trim() : ''
    if (!name) {
      skippedNoName++
      continue
    }
    const kcal = toNumberOrNull(row.food_energy)
    if (kcal == null) skippedNoEnergy++
    items.push({
      id: `israeli_db:${code}`,
      source: 'israeli_db',
      sourceId: code,
      originalName: name,
      displayNameHe: name,
      englishName: typeof row.english_name === 'string' && row.english_name.trim() ? row.english_name.trim() : null,
      brand: null,
      barcode: null,
      imageUrl: null,
      per100: {
        kcal,
        proteinG: toNumberOrNull(row.protein),
        carbsG: toNumberOrNull(row.carbohydrates),
        fatG: toNumberOrNull(row.total_fat),
      },
      baseUnit: 'g',
      units: unitsByFoodCode.get(code) ?? [],
      fetchedAt,
      sourceUpdatedAt: parseIsraeliDate(row.tarich_idkun),
      verified: true,
    })
  }

  await mkdir(path.dirname(OUT_PATH), { recursive: true })
  await writeFile(OUT_PATH, JSON.stringify({ generatedAt: fetchedAt, source: 'data.gov.il nutrition-database', count: items.length, items }, null, 0))

  console.log(`\nנכתבו ${items.length} מזונות אל ${path.relative(process.cwd(), OUT_PATH)}`)
  console.log(`  ${skippedNoName} רשומות דולגו (ללא שם), ${skippedNoEnergy} רשומות ללא ערך אנרגיה (נשמרו עם kcal=null)`)
  console.log(`  ${unitWeightRows.length} רשומות משקל מידה, ${unitNameRows.length} שמות מידות, שויכו ל-${unitsByFoodCode.size} קודי מזון`)

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.log('\n[Supabase] VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY לא מוגדרים — דולג על upsert לענן.')
    console.log('[Supabase] הקובץ המקומי נכתב בהצלחה ומשמש כברירת מחדל (מצב הדגמה / ללא פרויקט מחובר).')
    return
  }

  console.log('\n[Supabase] נמצאו פרטי חיבור, מבצע upsert...')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, serviceKey)

  const foodRowsForDb = items.map((it) => ({
    source: it.source,
    source_id: it.sourceId,
    original_name: it.originalName,
    display_name_he: it.displayNameHe,
    english_name: it.englishName,
    brand: it.brand,
    barcode: it.barcode,
    kcal_per_100: it.per100.kcal,
    protein_g_per_100: it.per100.proteinG,
    carbs_g_per_100: it.per100.carbsG,
    fat_g_per_100: it.per100.fatG,
    base_unit: it.baseUnit,
    fetched_at: it.fetchedAt,
    source_updated_at: it.sourceUpdatedAt,
    verified: it.verified,
  }))

  const CHUNK = 500
  let upserted = 0
  // מפת code -> id נבנית ישירות מתגובת ה-upsert של כל צ'אנק, ולא מ-select נפרד לאחר מכן:
  // ל-PostgREST יש הגבלת שורות ברירת מחדל (בד"כ 1000) שהייתה גורמת לאובדן שקט של מזונות
  // מעבר להגבלה, וכתוצאה מכך רוב יחידות המידה לא היו משויכות (נצפה בפועל בהרצה קודמת).
  const foodIdByCode = new Map()
  for (let i = 0; i < foodRowsForDb.length; i += CHUNK) {
    const chunk = foodRowsForDb.slice(i, i + CHUNK)
    const { data: upsertedRows, error } = await supabase
      .from('foods')
      .upsert(chunk, { onConflict: 'source,source_id' })
      .select('id, source_id')
    if (error) throw new Error(`Supabase upsert foods failed at chunk ${i}: ${error.message}`)
    for (const row of upsertedRows) foodIdByCode.set(row.source_id, row.id)
    upserted += chunk.length
    process.stdout.write(`\r[Supabase] foods: ${upserted}/${foodRowsForDb.length}`)
  }
  process.stdout.write('\n')

  const unitRowsForDb = []
  for (const it of items) {
    const foodId = foodIdByCode.get(it.sourceId)
    if (!foodId) continue
    for (const u of it.units) {
      unitRowsForDb.push({ food_id: foodId, unit_code: u.code, label_he: u.labelHe, grams: u.grams })
    }
  }

  const allFoodIds = Array.from(foodIdByCode.values())
  for (let i = 0; i < allFoodIds.length; i += CHUNK) {
    const idsChunk = allFoodIds.slice(i, i + CHUNK)
    const { error: delErr } = await supabase.from('food_units').delete().in('food_id', idsChunk)
    if (delErr) throw new Error(`Supabase delete food_units failed at chunk ${i}: ${delErr.message}`)
  }

  let unitsUpserted = 0
  for (let i = 0; i < unitRowsForDb.length; i += CHUNK) {
    const chunk = unitRowsForDb.slice(i, i + CHUNK)
    const { error } = await supabase.from('food_units').insert(chunk)
    if (error) throw new Error(`Supabase insert food_units failed at chunk ${i}: ${error.message}`)
    unitsUpserted += chunk.length
    process.stdout.write(`\r[Supabase] food_units: ${unitsUpserted}/${unitRowsForDb.length}`)
  }
  process.stdout.write('\n')
  console.log(`[Supabase] הושלם: ${upserted} מזונות, ${unitsUpserted} יחידות מידה.`)
}

main().catch((err) => {
  console.error('\nהייבוא נכשל:', err.message)
  process.exitCode = 1
})
