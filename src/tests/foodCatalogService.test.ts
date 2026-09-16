import { describe, expect, it } from 'vitest'
import { demoFoodCatalogService } from '@/services/foods/demoFoodCatalogService'
import { resetDemoData } from '@/services/demo/demoStore'

const USER = 'user-a'

describe('demoFoodCatalogService — חיפוש עברי במאגר הישראלי האמיתי שיובא', () => {
  it('המאגר המקומי נטען עם רשומות אמיתיות (לא 3 דוגמאות בלבד)', async () => {
    const count = await demoFoodCatalogService.count()
    expect(count).toBeGreaterThan(1000)
  })

  it('"קוטג\' תנובה 5%" מתאים למוצר הנכון (קוד 494) בראש התוצאות', async () => {
    const results = await demoFoodCatalogService.search(USER, 'קוטג תנובה 5%')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].item.sourceId).toBe('494')
    expect(results[0].item.per100.kcal).toBe(95)
  })

  it('"לאבנה גד" עמום — מציג כמה אפשרויות (5%, 9%, עיזים) ולא בוחר אחת אוטומטית', async () => {
    const results = await demoFoodCatalogService.search(USER, 'לאבנה גד')
    const ids = results.map((r) => r.item.sourceId)
    expect(ids).toEqual(expect.arrayContaining(['8519', '8688', '132']))
    expect(results.length).toBeGreaterThan(1)
  })

  it('מזון עם מידות ביתיות (קוטג׳ 494) חושף כף/כפית/גביע עם המשקל שנלקח בחשבון', async () => {
    const results = await demoFoodCatalogService.search(USER, 'קוטג תנובה 5%')
    const item = results[0].item
    const cup = item.units.find((u) => u.labelHe === 'גביע')
    expect(cup?.grams).toBe(250)
  })
})

describe('demoFoodCatalogService — מוצר פרטי (השלמה מהתווית)', () => {
  it('מוצר שנשמר פרטית מופיע בחיפוש של אותו משתמש בלבד', async () => {
    resetDemoData()
    await demoFoodCatalogService.addUserFood(USER, {
      displayName: 'עוגיות בית מיוחדות',
      brand: null,
      barcode: null,
      kcalPer100: 450,
      proteinPer100: 5,
      carbsPer100: 60,
      fatPer100: 20,
    })

    const resultsForOwner = await demoFoodCatalogService.search(USER, 'עוגיות בית מיוחדות')
    expect(resultsForOwner.some((r) => r.item.source === 'user')).toBe(true)

    const resultsForOther = await demoFoodCatalogService.search('user-b', 'עוגיות בית מיוחדות')
    expect(resultsForOther.some((r) => r.item.source === 'user')).toBe(false)
  })
})
