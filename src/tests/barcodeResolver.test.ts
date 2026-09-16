import { describe, expect, it, vi, beforeEach } from 'vitest'
import { resolveProductByBarcode } from '@/services/foods/barcodeResolver'
import { demoFoodCatalogService } from '@/services/foods/demoFoodCatalogService'
import { resetDemoData } from '@/services/demo/demoStore'
import { OffError } from '@/services/foods/offClient'

const USER = 'user-a'

describe('resolveProductByBarcode — סדר עדיפויות: מוצר פרטי לפני ספק חיצוני', () => {
  beforeEach(() => {
    resetDemoData()
  })

  it('ברקוד לא תקין נדחה מיד בלי לפנות לאף מקור', async () => {
    await expect(resolveProductByBarcode(demoFoodCatalogService, USER, '123')).rejects.toBeInstanceOf(OffError)
  })

  it('מוצר פרטי שהמשתמש שמר עם ברקוד תואם מוחזר, ולא המוצר מ-Open Food Facts', async () => {
    // 7290004127329 הוא ברקוד fixture אמיתי (קוטג' תנובה 5%) — אם המשתמש תיקן אותו פרטית,
    // התיקון הפרטי צריך לגבור בסריקות הבאות.
    await demoFoodCatalogService.addUserFood(USER, {
      displayName: 'קוטג׳ תנובה — התיקון שלי',
      brand: 'תנובה',
      barcode: '7290004127329',
      kcalPer100: 100,
      proteinPer100: 12,
      carbsPer100: 2,
      fatPer100: 6,
    })

    const item = await resolveProductByBarcode(demoFoodCatalogService, USER, '7290004127329')
    expect(item.source).toBe('user')
    expect(item.displayNameHe).toBe('קוטג׳ תנובה — התיקון שלי')
    expect(item.per100.kcal).toBe(100)
  })

  it('בלי מוצר פרטי תואם, נופל ל-Open Food Facts (fixture מאומת)', async () => {
    const item = await resolveProductByBarcode(demoFoodCatalogService, USER, '7290004127329')
    expect(item.source).toBe('off')
    expect(item.per100.kcal).toBe(95)
  })

  it('מוצר פרטי של משתמש אחר לא חוסם את החיפוש עבור המשתמש הנוכחי', async () => {
    await demoFoodCatalogService.addUserFood('user-b', {
      displayName: 'לא שלי',
      brand: null,
      barcode: '7290004127329',
      kcalPer100: 1,
      proteinPer100: 1,
      carbsPer100: 1,
      fatPer100: 1,
    })
    const item = await resolveProductByBarcode(demoFoodCatalogService, USER, '7290004127329')
    expect(item.source).toBe('off')
  })
})

describe('fetchProductByBarcode — מניעת בקשות כפולות לאותו ברקוד', () => {
  it('שתי קריאות מקבילות לברקוד שלא ב-fixtures/cache חולקות בקשת רשת אחת', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        status: 1,
        product: {
          code: '7290000000015',
          product_name: 'מוצר בדיקה',
          nutrition_data_per: '100g',
          nutriments: { 'energy-kcal_100g': 200, proteins_100g: 5, carbohydrates_100g: 10, fat_100g: 3 },
        },
      }),
    })) as unknown as typeof fetch
    vi.stubGlobal('fetch', fetchMock)

    const { fetchProductByBarcode } = await import('@/services/foods/offClient')
    const [a, b] = await Promise.all([fetchProductByBarcode('7290000000015'), fetchProductByBarcode('7290000000015')])

    expect(a.per100.kcal).toBe(200)
    expect(b.per100.kcal).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })
})
