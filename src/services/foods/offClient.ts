// לקוח Open Food Facts: שליפת מוצר לפי ברקוד. תיעוד: https://openfoodfacts.github.io/openfoodfacts-server/api/
// מגבלת קצב מתועדת: 15 קריאות מוצר / 10 חיפושים לדקה לכל IP — נאכפת כאן בצד הלקוח (חלה על כלל
// המשתמשים שמריצים את אותו שרת/דפדפן, לא לכל משתמש בנפרד, כי אין שרת ביניים באפליקציה זו).
import fixturesData from '@/data/foodCatalogOffFixtures.json'
import { validateBarcode, barcodeLookupCandidates } from '@/lib/barcodeValidation'
import type { FoodCatalogItem } from './foodTypes'

const API_BASE = 'https://world.openfoodfacts.org/api/v2'
const APP_NAME = 'PersonalNutritionApp'
const APP_VERSION = '1.0'
const REQUEST_TIMEOUT_MS = 8000
const MAX_RETRIES = 2
const RETRY_BASE_DELAY_MS = 500

export const OFF_RATE_LIMIT_PER_MINUTE = 15

const requestTimestamps: number[] = []

function pruneOldTimestamps(now: number) {
  const cutoff = now - 60_000
  while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) {
    requestTimestamps.shift()
  }
}

function isRateLimited(): boolean {
  pruneOldTimestamps(Date.now())
  return requestTimestamps.length >= OFF_RATE_LIMIT_PER_MINUTE
}

function recordRequest() {
  requestTimestamps.push(Date.now())
}

export class OffError extends Error {
  constructor(
    message: string,
    public readonly kind: 'not_found' | 'rate_limited' | 'unavailable' | 'timeout' | 'invalid',
  ) {
    super(message)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': `${APP_NAME}/${APP_VERSION}` },
    })
  } finally {
    clearTimeout(timer)
  }
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * מנקה ומאמת קלט ברקוד: ספרות בלבד, שומר אפסים מובילים (זהו ערך שאומת, לא URL), ודוחה קלט
 * שאורכו/ספרת הביקורת שלו לא תואמים EAN-13/EAN-8/UPC-A — לא רק "יש מספיק ספרות".
 */
export function sanitizeBarcode(raw: string): string | null {
  const digits = raw.trim().replace(/[^0-9]/g, '')
  if (!digits) return null
  return validateBarcode(digits).valid ? digits : null
}

interface OffProductResponse {
  status: number
  product?: {
    code?: string
    product_name?: string
    product_name_he?: string
    brands?: string
    quantity?: string
    serving_size?: string
    nutrition_data_per?: string
    last_modified_t?: number
    nutriments?: Record<string, unknown>
    image_front_url?: string
    image_url?: string
  }
}

function mapOffProduct(barcode: string, body: OffProductResponse): FoodCatalogItem | null {
  const p = body.product
  if (body.status !== 1 || !p) return null

  const nutriments = p.nutriments ?? {}
  const perBasis = p.nutrition_data_per
  // ערכי ה-*_100g תקפים רק כש-nutrition_data_per הוא "100g" (או לא צוין — ברירת המחדל של OFF).
  // אם הבסיס שונה (למשל "מנה"), אין לנו המרה מהימנה ל-100 גרם ולכן הערכים יישארו null.
  const per100Valid = !perBasis || perBasis === '100g'

  const kcal = per100Valid ? toNumberOrNull(nutriments['energy-kcal_100g']) : null
  const proteinG = per100Valid ? toNumberOrNull(nutriments['proteins_100g']) : null
  const carbsG = per100Valid ? toNumberOrNull(nutriments['carbohydrates_100g']) : null
  const fatG = per100Valid ? toNumberOrNull(nutriments['fat_100g']) : null

  const displayName = p.product_name_he?.trim() || p.product_name?.trim() || 'מוצר ללא שם'

  return {
    id: `off:${barcode}`,
    source: 'off',
    sourceId: barcode,
    originalName: p.product_name?.trim() || displayName,
    displayNameHe: displayName,
    englishName: p.product_name && p.product_name !== displayName ? p.product_name : null,
    brand: p.brands?.trim() || null,
    barcode,
    imageUrl: p.image_front_url?.trim() || p.image_url?.trim() || null,
    per100: { kcal, proteinG, carbsG, fatG },
    baseUnit: 'g',
    units: p.serving_size ? [{ code: 'serving', labelHe: `מנה (${p.serving_size})`, grams: parseGramsFromServing(p.serving_size) ?? 0 }].filter((u) => u.grams > 0) : [],
    fetchedAt: new Date().toISOString(),
    sourceUpdatedAt: p.last_modified_t ? new Date(p.last_modified_t * 1000).toISOString() : null,
    verified: false,
  }
}

function parseGramsFromServing(serving: string): number | null {
  const m = serving.match(/([\d.]+)\s*g/i)
  return m ? Number(m[1]) : null
}

const fixturesByBarcode = new Map<string, FoodCatalogItem>(
  (fixturesData.items as FoodCatalogItem[]).map((item) => [item.barcode as string, item]),
)

const runtimeCache = new Map<string, FoodCatalogItem>()
const OFF_FIELDS =
  'code,product_name,product_name_he,brands,quantity,serving_size,nutrition_data_per,last_modified_t,nutriments,image_front_url,image_url'

/** ניסיון שליפה יחיד מול קוד ספציפי (בלי fallback על צורות שקולות) — עם retry על 429/503/timeout. */
async function fetchOneCode(code: string): Promise<FoodCatalogItem | 'not_found'> {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      recordRequest()
      const res = await fetchWithTimeout(`${API_BASE}/product/${code}.json?fields=${OFF_FIELDS}`, REQUEST_TIMEOUT_MS)
      if (res.status === 429 || res.status === 503) {
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt)
          continue
        }
        throw new OffError('שירות Open Food Facts עמוס כרגע, נסו שוב בעוד רגע', 'unavailable')
      }
      if (!res.ok) throw new OffError(`שגיאת שרת (${res.status})`, 'unavailable')
      const body = (await res.json()) as OffProductResponse
      const item = mapOffProduct(code, body)
      return item ?? 'not_found'
    } catch (err) {
      lastError = err
      if (err instanceof OffError) throw err
      if (err instanceof Error && err.name === 'AbortError') {
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt)
          continue
        }
        throw new OffError('תם הזמן הקצוב לחיבור ל-Open Food Facts', 'timeout')
      }
      throw err
    }
  }
  throw lastError instanceof Error ? lastError : new OffError('שגיאה לא צפויה', 'unavailable')
}

const inFlight = new Map<string, Promise<FoodCatalogItem>>()

/**
 * שליפת מוצר לפי ברקוד. סדר עדיפויות: קאש ריצה/fixtures > רשת חיה. מנסה גם צורות שקולות
 * UPC-A/EAN-13 (אפס מוביל בודד) אם הברקוד שנסרק לא נמצא בצורתו המדויקת — תקלת רשת בניסיון
 * אחד אינה מוכרזת "לא נמצא" לפני שמוצו כל הצורות והניסיונות. מוני בקשות כפולות לאותו ברקוד
 * חולקים promise יחיד כדי שסריקה כפולה/לחיצה חוזרת לא תיצור שתי בקשות.
 */
export async function fetchProductByBarcode(rawBarcode: string): Promise<FoodCatalogItem> {
  const barcode = sanitizeBarcode(rawBarcode)
  if (!barcode) throw new OffError('ברקוד לא תקין', 'invalid')

  const cached = runtimeCache.get(barcode) ?? fixturesByBarcode.get(barcode)
  if (cached) return cached

  const existing = inFlight.get(barcode)
  if (existing) return existing

  const promise = (async () => {
    try {
      if (isRateLimited()) {
        throw new OffError('חריגה ממגבלת הקריאות ל-Open Food Facts (15 בדקה) — נסו שוב בעוד רגע', 'rate_limited')
      }

      const candidates = barcodeLookupCandidates(barcode)
      let notFoundCount = 0
      for (const candidate of candidates) {
        const cachedCandidate = runtimeCache.get(candidate) ?? fixturesByBarcode.get(candidate)
        if (cachedCandidate) {
          const item = { ...cachedCandidate, barcode, sourceId: barcode }
          runtimeCache.set(barcode, item)
          return item
        }
        const result = await fetchOneCode(candidate)
        if (result !== 'not_found') {
          // שומרים את הברקוד כפי שנסרק בפועל (המחרוזת הפיזית על המוצר), גם אם ההתאמה נמצאה בצורה השקולה.
          const item = { ...result, barcode, sourceId: barcode }
          runtimeCache.set(barcode, item)
          return item
        }
        notFoundCount++
      }
      if (notFoundCount === candidates.length) {
        throw new OffError('המוצר לא נמצא במאגר Open Food Facts', 'not_found')
      }
      throw new OffError('שגיאה לא צפויה', 'unavailable')
    } finally {
      inFlight.delete(barcode)
    }
  })()

  inFlight.set(barcode, promise)
  return promise
}
