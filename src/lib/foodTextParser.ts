// פענוח כללים למשפט טבעי קצר בעברית לתיאור פריט מזון (ללא שירות AI חיצוני).
// תומך רק בדפוסים מוגדרים מראש: [כמות|"חצי"] [יחידה] [מותג?] [שם מזון] [אחוז שומן?].
// כל משפט שלא מזוהה במלואו מוחזר עם confident=false ועם הטקסט המקורי, ולא מומצא לו ניחוש.
import { canonicalizeSpelling, normalizeHebrew } from './hebrewText'

export interface ParsedFoodText {
  raw: string
  confident: boolean
  quantity: number | null
  unitLabel: string | null
  brand: string | null
  fatPercent: number | null
  foodNameGuess: string | null
}

const UNIT_WORDS: Record<string, string> = {
  'כף': 'כף',
  'כפות': 'כף',
  'כפית': 'כפית',
  'כפיות': 'כפית',
  'גביע': 'גביע',
  'גביעים': 'גביע',
  'יחידה': 'יחידה',
  'יחידות': 'יחידה',
  'פרוסה': 'פרוסה',
  'פרוסות': 'פרוסה',
  'קערה': 'קערה',
  'קערות': 'קערה',
  'גרם': 'גרם',
  'גרמים': 'גרם',
  'גר': 'גרם',
  'מל': 'מ"ל',
  'מיליליטר': 'מ"ל',
  'כוס': 'כוס',
  'כוסות': 'כוס',
  'אריזה': 'אריזה',
}

const BRAND_WORDS = new Set(['תנובה', 'גד', 'שטראוס', 'תלמה', 'אסם'])

const FAT_PERCENT_RE = /(\d+(?:\.\d+)?)\s*(%|אחוז(?:ים)?)/

function normalizeToken(token: string): string {
  return canonicalizeSpelling(normalizeHebrew(token))
}

export function parseFoodText(raw: string): ParsedFoodText {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { raw, confident: false, quantity: null, unitLabel: null, brand: null, fatPercent: null, foodNameGuess: null }
  }

  let working = trimmed
  let fatPercent: number | null = null
  const fatMatch = working.match(FAT_PERCENT_RE)
  if (fatMatch) {
    fatPercent = Number(fatMatch[1])
    working = (working.slice(0, fatMatch.index) + working.slice((fatMatch.index ?? 0) + fatMatch[0].length)).trim()
  }

  const originalTokens = working.split(/\s+/).filter(Boolean)
  if (originalTokens.length === 0) {
    return { raw, confident: false, quantity: null, unitLabel: null, brand: null, fatPercent, foodNameGuess: null }
  }

  let cursor = 0
  let quantity: number | null = null

  const firstNormalized = normalizeToken(originalTokens[cursor] ?? '')
  if (firstNormalized === 'חצי') {
    quantity = 0.5
    cursor++
  } else if (/^\d+(\.\d+)?$/.test(originalTokens[cursor] ?? '')) {
    quantity = Number(originalTokens[cursor])
    cursor++
  }

  let unitLabel: string | null = null
  if (cursor < originalTokens.length) {
    const candidate = normalizeToken(originalTokens[cursor])
    if (UNIT_WORDS[candidate]) {
      unitLabel = UNIT_WORDS[candidate]
      cursor++
    }
  }

  // "כף קוטג'..." — יחידה בלי כמות מפורשת מרמזת על כמות יחידה אחת.
  if (quantity === null && unitLabel !== null) {
    quantity = 1
  }

  const remainingTokens = originalTokens.slice(cursor)
  let brand: string | null = null
  const foodWords: string[] = []
  for (const token of remainingTokens) {
    const normalized = normalizeToken(token)
    if (!brand && BRAND_WORDS.has(normalized)) {
      brand = normalized
      continue
    }
    foodWords.push(token)
  }

  const foodNameGuess = foodWords.length > 0 ? foodWords.join(' ') : null
  const confident = quantity !== null && unitLabel !== null && foodNameGuess !== null

  return { raw, confident, quantity, unitLabel, brand, fatPercent, foodNameGuess }
}
