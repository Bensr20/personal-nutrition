import { describe, expect, it } from 'vitest'
import { validateBarcode, barcodeLookupCandidates } from '@/lib/barcodeValidation'

describe('validateBarcode — ספרת ביקורת אמיתית, לא רק אורך', () => {
  it('EAN-13 תקין (נוטלה)', () => {
    expect(validateBarcode('4006381333931')).toEqual({ valid: true, format: 'EAN13' })
  })

  it('EAN-13 עם ספרת ביקורת שגויה נדחה', () => {
    const r = validateBarcode('4006381333932')
    expect(r.valid).toBe(false)
    expect(r.format).toBeNull()
  })

  it('UPC-A תקין', () => {
    expect(validateBarcode('036000291452')).toEqual({ valid: true, format: 'UPCA' })
  })

  it('EAN-8 תקין', () => {
    expect(validateBarcode('40170725')).toEqual({ valid: true, format: 'EAN8' })
  })

  it('אורך לא נתמך נדחה (לא רק "יש ספרות")', () => {
    expect(validateBarcode('12345').valid).toBe(false)
    expect(validateBarcode('123456789012345').valid).toBe(false)
  })

  it('קלט עם תווים שאינם ספרות נדחה', () => {
    expect(validateBarcode('abc0004006381').valid).toBe(false)
  })

  it('שומר אפסים מובילים — לא מתייחס אליהם כמחרוזת ריקה/קצרה', () => {
    // UPC-A שמתחיל באפס עדיין נבדק כ-12 ספרות, לא "מתקצר" ל-11 (ספרת ביקורת אומתה בנפרד)
    const r = validateBarcode('003600029143')
    expect(r.format).toBe('UPCA')
  })
})

describe('barcodeLookupCandidates — שקילות UPC-A/EAN-13 מפורשת בלבד', () => {
  it('UPC-A מציע גם את הצורה עם אפס מוביל (EAN-13)', () => {
    expect(barcodeLookupCandidates('036000291452')).toEqual(['036000291452', '0036000291452'])
  })

  it('EAN-13 שמתחיל באפס מציע גם את הצורה בלי האפס (UPC-A)', () => {
    expect(barcodeLookupCandidates('0036000291452')).toEqual(['0036000291452', '036000291452'])
  })

  it('EAN-13 שלא מתחיל באפס אינו מקבל צורה חלופית מומצאת', () => {
    expect(barcodeLookupCandidates('4006381333931')).toEqual(['4006381333931'])
  })

  it('EAN-8 אינו מקבל שקילות UPC-A (אורך לא רלוונטי)', () => {
    expect(barcodeLookupCandidates('40170725')).toEqual(['40170725'])
  })

  it('ברקוד לא תקין לא מחזיר אף מועמד (לא ממציא ניחוש)', () => {
    expect(barcodeLookupCandidates('123456789099')).toEqual([])
  })
})
