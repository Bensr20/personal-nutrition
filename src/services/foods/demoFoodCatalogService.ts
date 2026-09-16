import { newId } from '@/lib/id'
import { mutateDemoData } from '@/services/demo/demoStore'
import type { DemoUserFood } from '@/services/demo/demoStore'
import { FoodCatalogIndex } from './foodCatalogIndex'
import type { FoodCatalogItem, FoodCatalogService, UserFoodInput } from './foodTypes'

let indexPromise: Promise<FoodCatalogIndex> | null = null

async function getIndex(): Promise<FoodCatalogIndex> {
  if (!indexPromise) {
    indexPromise = import('@/data/foodCatalogIsraeli.json').then((mod) => {
      const idx = new FoodCatalogIndex()
      idx.setItems((mod.default ?? mod).items as FoodCatalogItem[])
      return idx
    })
  }
  return indexPromise
}

function userFoodToCatalogItem(uf: DemoUserFood): FoodCatalogItem {
  return {
    id: `user:${uf.id}`,
    source: 'user',
    sourceId: uf.id,
    originalName: uf.displayName,
    displayNameHe: uf.displayName,
    englishName: null,
    brand: uf.brand,
    barcode: uf.barcode,
    imageUrl: null,
    per100: { kcal: uf.kcalPer100, proteinG: uf.proteinPer100, carbsG: uf.carbsPer100, fatG: uf.fatPer100 },
    baseUnit: 'g',
    units: [],
    fetchedAt: uf.createdAt,
    sourceUpdatedAt: null,
    verified: false,
  }
}

export const demoFoodCatalogService: FoodCatalogService = {
  async search(userId, query, limit = 20) {
    const idx = await getIndex()
    const catalogResults = idx.search(query, limit)
    const userFoods = await mutateDemoData((data) => Object.values(data.userFoods).filter((f) => f.userId === userId))
    const userItems = userFoods.map(userFoodToCatalogItem)
    const userIdx = new FoodCatalogIndex()
    userIdx.setItems(userItems)
    const userResults = userIdx.search(query, limit)
    return [...userResults, ...catalogResults].sort((a, b) => b.score - a.score).slice(0, limit)
  },

  async getById(userId, id) {
    if (id.startsWith('user:')) {
      const uf = await mutateDemoData((data) => data.userFoods[id.slice('user:'.length)])
      return uf && uf.userId === userId ? userFoodToCatalogItem(uf) : null
    }
    const idx = await getIndex()
    return idx.getById(id)
  },

  async count() {
    const idx = await getIndex()
    return idx.count()
  },

  async addUserFood(userId, input) {
    return mutateDemoData((data) => {
      const id = newId()
      const record: DemoUserFood = {
        id,
        userId,
        displayName: input.displayName,
        brand: input.brand,
        barcode: input.barcode,
        kcalPer100: input.kcalPer100,
        proteinPer100: input.proteinPer100,
        carbsPer100: input.carbsPer100,
        fatPer100: input.fatPer100,
        createdAt: new Date().toISOString(),
      }
      data.userFoods[id] = record
      return userFoodToCatalogItem(record)
    })
  },

  async listUserFoods(userId) {
    const records = await mutateDemoData((data) => Object.values(data.userFoods).filter((f) => f.userId === userId))
    return records.map(userFoodToCatalogItem)
  },

  async findUserFoodByBarcode(userId, barcode) {
    const record = await mutateDemoData((data) =>
      Object.values(data.userFoods).find((f) => f.userId === userId && f.barcode === barcode),
    )
    return record ? userFoodToCatalogItem(record) : null
  },
}
