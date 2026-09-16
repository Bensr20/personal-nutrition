// אינדקס חיפוש בזיכרון על מאגר מזונות שכבר נטען (מקומי-Bundle או Supabase) — לוגיקה משותפת
// לשני המימושים (demo/supabase) כדי לא לשכפל את חיפוש הטקסט העברי.
import { matchScore } from '@/lib/hebrewText'
import type { FoodCatalogItem, FoodSearchResult } from './foodTypes'

const MIN_SCORE = 0.25

export class FoodCatalogIndex {
  private items: FoodCatalogItem[] = []
  private byId = new Map<string, FoodCatalogItem>()

  setItems(items: FoodCatalogItem[]) {
    this.items = items
    this.byId = new Map(items.map((it) => [it.id, it]))
  }

  addOrReplace(item: FoodCatalogItem) {
    const existingIdx = this.items.findIndex((it) => it.id === item.id)
    if (existingIdx >= 0) this.items[existingIdx] = item
    else this.items.push(item)
    this.byId.set(item.id, item)
  }

  count(): number {
    return this.items.length
  }

  getById(id: string): FoodCatalogItem | null {
    return this.byId.get(id) ?? null
  }

  search(query: string, limit = 20): FoodSearchResult[] {
    const trimmed = query.trim()
    if (!trimmed) return []
    const results: FoodSearchResult[] = []
    for (const item of this.items) {
      const nameScore = matchScore(trimmed, item.displayNameHe)
      const brandBoost = item.brand && matchScore(trimmed, `${item.brand} ${item.displayNameHe}`) > nameScore ? 0.05 : 0
      const score = nameScore + brandBoost
      if (score >= MIN_SCORE) results.push({ item, score })
    }
    results.sort((a, b) => b.score - a.score || a.item.displayNameHe.localeCompare(b.item.displayNameHe, 'he'))
    return results.slice(0, limit)
  }
}
