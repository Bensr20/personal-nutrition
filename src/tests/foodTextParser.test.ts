import { describe, expect, it } from 'vitest'
import { parseFoodText } from '@/lib/foodTextParser'

describe('parseFoodText — דוגמאות מוגדרות מהמפרט', () => {
  it('"כף קוטג׳ תנובה 5 אחוז"', () => {
    const r = parseFoodText('כף קוטג׳ תנובה 5 אחוז')
    expect(r.confident).toBe(true)
    expect(r.quantity).toBe(1)
    expect(r.unitLabel).toBe('כף')
    expect(r.brand).toBe('תנובה')
    expect(r.fatPercent).toBe(5)
    expect(r.foodNameGuess).toContain('קוטג')
  })

  it('"2 כפות קוטג׳ תנובה 5%"', () => {
    const r = parseFoodText('2 כפות קוטג׳ תנובה 5%')
    expect(r.confident).toBe(true)
    expect(r.quantity).toBe(2)
    expect(r.unitLabel).toBe('כף')
    expect(r.brand).toBe('תנובה')
    expect(r.fatPercent).toBe(5)
  })

  it('"150 גרם לאבנה גד 5%"', () => {
    const r = parseFoodText('150 גרם לאבנה גד 5%')
    expect(r.confident).toBe(true)
    expect(r.quantity).toBe(150)
    expect(r.unitLabel).toBe('גרם')
    expect(r.brand).toBe('גד')
    expect(r.fatPercent).toBe(5)
    expect(r.foodNameGuess).toContain('לאבנה')
  })

  it('"חצי גביע קוטג׳ תנובה 5%" — תומך ב"חצי"', () => {
    const r = parseFoodText('חצי גביע קוטג׳ תנובה 5%')
    expect(r.confident).toBe(true)
    expect(r.quantity).toBe(0.5)
    expect(r.unitLabel).toBe('גביע')
    expect(r.brand).toBe('תנובה')
    expect(r.fatPercent).toBe(5)
  })

  it('כמות "5%" אינה מפוענחת כ-5 גרם — "5%" מוסר כאחוז שומן בלבד', () => {
    const r = parseFoodText('150 גרם לאבנה גד 5%')
    expect(r.quantity).not.toBe(5)
    expect(r.fatPercent).toBe(5)
  })

  it('משפט עמום/לא נתמך מוחזר עם confident=false והטקסט המקורי, בלי ניחוש מומצא', () => {
    const r = parseFoodText('משהו מוזר לגמרי בלי מבנה מוכר')
    expect(r.confident).toBe(false)
    expect(r.raw).toBe('משהו מוזר לגמרי בלי מבנה מוכר')
  })

  it('משפט ריק אינו קורס ומוחזר כלא-מובן', () => {
    const r = parseFoodText('   ')
    expect(r.confident).toBe(false)
  })
})
