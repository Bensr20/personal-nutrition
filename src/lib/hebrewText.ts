// נרמול טקסט עברי לצורכי חיפוש: גרש/גרשיים/ניקוד/רווחים כפולים + מילון שמות חלופיים מפוקח.
// אין כאן "תרגום" סמנטי (לדוגמה גבינה לבנה -> לאבנה) — רק צורות כתיב שונות לאותה מילה.

const NIQQUD_RE = /[֑-ׇ]/g
const GERSHAYIM_RE = /[׳'`״"]/g

export function normalizeHebrew(input: string): string {
  return input
    .normalize('NFC')
    .replace(NIQQUD_RE, '')
    .replace(GERSHAYIM_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// זוגות כתיב חלופי לאותה מילה/מותג — לא מרחיב משמעות, רק מאחד ייצוגים גרפיים.
const SPELLING_GROUPS: string[][] = [
  ['קוטג', 'קוטג׳', "קוטג'", 'cottage'],
  ['תנובה', 'tnuva'],
  ['גד', 'gad'],
  ['לאבנה', 'labane', 'labaneh'],
  ['שטראוס', 'strauss'],
  ['תלמה', 'telma'],
  ['אסם', 'osem'],
]

const spellingToCanonical = new Map<string, string>()
for (const group of SPELLING_GROUPS) {
  const canonical = normalizeHebrew(group[0])
  for (const variant of group) {
    spellingToCanonical.set(normalizeHebrew(variant), canonical)
  }
}

/** מחליף מילים בודדות בטקסט מנורמל בצורתן הקנונית (כתיב בלבד, לא משמעות). */
export function canonicalizeSpelling(normalizedText: string): string {
  return normalizedText
    .split(' ')
    .map((word) => spellingToCanonical.get(word) ?? word)
    .join(' ')
}

export function normalizeForSearch(input: string): string {
  return canonicalizeSpelling(normalizeHebrew(input))
}

/** ניקוד התאמה פשוט: 1 = שוויון מלא, 0 = אין חפיפה. משמש לדירוג תוצאות חיפוש. */
export function matchScore(query: string, candidate: string): number {
  const q = normalizeForSearch(query)
  const c = normalizeForSearch(candidate)
  if (!q) return 0
  if (c === q) return 1
  if (c.startsWith(q)) return 0.9
  const qWords = q.split(' ').filter(Boolean)
  const cWords = c.split(' ').filter(Boolean)
  if (qWords.every((w) => cWords.some((cw) => cw.startsWith(w)))) return 0.7
  if (c.includes(q)) return 0.6
  const matchedWords = qWords.filter((w) => cWords.some((cw) => cw.includes(w)))
  if (matchedWords.length > 0) return 0.3 * (matchedWords.length / qWords.length)
  return 0
}
