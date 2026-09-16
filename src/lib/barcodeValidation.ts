// אימות פורמט ברקוד (EAN-13 / EAN-8 / UPC-A) לפי אורך וספרת ביקורת בפועל — לא רק "יש מספיק ספרות".
// שומר את הברקוד כמחרוזת תמיד (אפסים מובילים לא נמחקים) ומטפל בשקילות UPC-A/EAN-13 במפורש,
// בלי לחתוך אפסים באופן גורף.

export type BarcodeFormat = 'EAN13' | 'EAN8' | 'UPCA'

export interface BarcodeValidation {
  valid: boolean
  format: BarcodeFormat | null
  reason?: string
}

/** ספרת ביקורת לפי אלגוריתם GS1 (EAN-13/UPC-A-כ-EAN-13): משקל 1/3 מתחלף על 12 הספרות הראשונות. */
function ean13CheckDigit(first12: string): number {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3)
  }
  return (10 - (sum % 10)) % 10
}

/** ספרת ביקורת EAN-8: משקל 3/1 מתחלף (הפוך מ-EAN-13) על 7 הספרות הראשונות. */
function ean8CheckDigit(first7: string): number {
  let sum = 0
  for (let i = 0; i < 7; i++) {
    sum += Number(first7[i]) * (i % 2 === 0 ? 3 : 1)
  }
  return (10 - (sum % 10)) % 10
}

export function validateBarcode(raw: string): BarcodeValidation {
  if (!/^\d+$/.test(raw)) {
    return { valid: false, format: null, reason: 'ברקוד חייב להכיל ספרות בלבד' }
  }

  if (raw.length === 13) {
    const ok = ean13CheckDigit(raw.slice(0, 12)) === Number(raw[12])
    return ok ? { valid: true, format: 'EAN13' } : { valid: false, format: null, reason: 'ספרת הביקורת אינה תואמת EAN-13' }
  }

  if (raw.length === 12) {
    // UPC-A שקול ל-EAN-13 עם אפס מוביל: מאמתים דרך אותו אלגוריתם בסיסי, בלי לשנות את המחרוזת המקורית.
    const padded = `0${raw}`
    const ok = ean13CheckDigit(padded.slice(0, 12)) === Number(padded[12])
    return ok ? { valid: true, format: 'UPCA' } : { valid: false, format: null, reason: 'ספרת הביקורת אינה תואמת UPC-A' }
  }

  if (raw.length === 8) {
    const ok = ean8CheckDigit(raw.slice(0, 7)) === Number(raw[7])
    return ok ? { valid: true, format: 'EAN8' } : { valid: false, format: null, reason: 'ספרת הביקורת אינה תואמת EAN-8' }
  }

  return { valid: false, format: null, reason: 'אורך ברקוד לא נתמך (נדרש EAN-13, EAN-8 או UPC-A)' }
}

/**
 * צורות שקולות לחיפוש מוצר: קודם הברקוד כפי שנסרק, ורק אז השקילות המפורשת בין UPC-A ל-EAN-13
 * (הוספת/הסרת אפס מוביל בודד). לעולם לא מוחקים אפסים מובילים באופן גורף מברקוד שלא זוהה כ-UPC-A.
 */
export function barcodeLookupCandidates(raw: string): string[] {
  const validation = validateBarcode(raw)
  if (!validation.valid) return []
  if (validation.format === 'UPCA') return [raw, `0${raw}`]
  if (validation.format === 'EAN13' && raw.startsWith('0')) return [raw, raw.slice(1)]
  return [raw]
}
