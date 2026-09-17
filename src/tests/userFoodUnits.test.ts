import { beforeEach, describe, expect, it } from 'vitest'
import { demoFoodCatalogService } from '@/services/foods/demoFoodCatalogService'
import { resetDemoData } from '@/services/demo/demoStore'

const USER_A = 'user-a'
const USER_B = 'user-b'

describe('"היחידה שלי" — יחידה אישית פר-מוצר, לא ניחוש גורף', () => {
  beforeEach(() => {
    resetDemoData()
  })

  it('נשמרת ונטענת חזרה עבור אותו מוצר', async () => {
    await demoFoodCatalogService.saveUserFoodUnit(USER_A, 'off', '7290004127329', 'הקערה שלי', 40)
    const units = await demoFoodCatalogService.listUserFoodUnits(USER_A, 'off', '7290004127329')
    expect(units).toHaveLength(1)
    expect(units[0]).toMatchObject({ label: 'הקערה שלי', grams: 40 })
  })

  it('שמירה חוזרת עם אותו שם מעדכנת את המשקל, לא יוצרת כפילות', async () => {
    await demoFoodCatalogService.saveUserFoodUnit(USER_A, 'off', '7290004127329', 'הקערה שלי', 40)
    await demoFoodCatalogService.saveUserFoodUnit(USER_A, 'off', '7290004127329', 'הקערה שלי', 55)
    const units = await demoFoodCatalogService.listUserFoodUnits(USER_A, 'off', '7290004127329')
    expect(units).toHaveLength(1)
    expect(units[0].grams).toBe(55)
  })

  it('לא חוצה בין מוצרים שונים — יחידה שנשמרה למוצר אחד לא מופיעה במוצר אחר', async () => {
    await demoFoodCatalogService.saveUserFoodUnit(USER_A, 'off', '7290004127329', 'הקערה שלי', 40)
    const otherProduct = await demoFoodCatalogService.listUserFoodUnits(USER_A, 'off', '7290005992735')
    expect(otherProduct).toHaveLength(0)
  })

  it('לא חוצה בין משתמשים — פרטי לחלוטין', async () => {
    await demoFoodCatalogService.saveUserFoodUnit(USER_A, 'off', '7290004127329', 'הקערה שלי', 40)
    const forUserB = await demoFoodCatalogService.listUserFoodUnits(USER_B, 'off', '7290004127329')
    expect(forUserB).toHaveLength(0)
  })

  it('אפשר לשמור כמה יחידות שונות לאותו מוצר', async () => {
    await demoFoodCatalogService.saveUserFoodUnit(USER_A, 'off', '7290004127329', 'הקערה שלי', 40)
    await demoFoodCatalogService.saveUserFoodUnit(USER_A, 'off', '7290004127329', 'הכוס שלי', 200)
    const units = await demoFoodCatalogService.listUserFoodUnits(USER_A, 'off', '7290004127329')
    expect(units).toHaveLength(2)
    expect(units.map((u) => u.label).sort()).toEqual(['הכוס שלי', 'הקערה שלי'])
  })
})
