// סדר זיהוי מוצר לפי ברקוד: מוצר פרטי (שנשמר/תוקן ע"י המשתמש) > קאש/fixtures (בתוך offClient) >
// ספק תזונה שכבר הוטמע (Open Food Facts — היחיד כרגע; המאגר הישראלי לא כולל ברקודים בכלל).
import { sanitizeBarcode, fetchProductByBarcode, OffError } from './offClient'
import type { FoodCatalogService, FoodCatalogItem } from './foodTypes'

export { OffError }

export async function resolveProductByBarcode(
  catalogService: FoodCatalogService,
  userId: string,
  rawBarcode: string,
): Promise<FoodCatalogItem> {
  const barcode = sanitizeBarcode(rawBarcode)
  if (!barcode) throw new OffError('ברקוד לא תקין — יש לוודא שהוא EAN-13, EAN-8 או UPC-A תקין', 'invalid')

  // תיקון/מוצר פרטי שהמשתמש שמר עבור הברקוד הזה מקבל תמיד עדיפות על פני החיפוש החיצוני.
  const userFood = await catalogService.findUserFoodByBarcode(userId, barcode)
  if (userFood) return userFood

  return fetchProductByBarcode(barcode)
}
