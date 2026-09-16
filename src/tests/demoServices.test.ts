import { beforeEach, describe, expect, it } from 'vitest'
import { demoLogsService } from '@/services/demo/demoLogsService'
import { demoMealsService } from '@/services/demo/demoMealsService'
import { resetDemoData } from '@/services/demo/demoStore'

const USER_A = 'user-a'
const USER_B = 'user-b'
const DATE = '2026-02-10'
const OTHER_DATE = '2026-02-11'

describe('demoLogsService — water summing and day boundaries', () => {
  beforeEach(() => {
    resetDemoData()
  })

  it('sums only the water logs belonging to the requested date', async () => {
    await demoLogsService.addWater(USER_A, DATE, 200)
    await demoLogsService.addWater(USER_A, DATE, 300)
    await demoLogsService.addWater(USER_A, OTHER_DATE, 500)

    const todayLogs = await demoLogsService.listWaterForDate(USER_A, DATE)
    const total = todayLogs.reduce((sum, w) => sum + w.amountMl, 0)

    expect(todayLogs).toHaveLength(2)
    expect(total).toBe(500)
  })

  it('keeps data for different users fully isolated (ownership)', async () => {
    await demoLogsService.addWater(USER_A, DATE, 200)
    await demoLogsService.addWater(USER_B, DATE, 999)

    const userALogs = await demoLogsService.listWaterForDate(USER_A, DATE)
    const userBLogs = await demoLogsService.listWaterForDate(USER_B, DATE)

    expect(userALogs).toHaveLength(1)
    expect(userALogs[0].amountMl).toBe(200)
    expect(userBLogs).toHaveLength(1)
    expect(userBLogs[0].amountMl).toBe(999)
  })

  it('deleteWater refuses to remove a log owned by another user', async () => {
    const log = await demoLogsService.addWater(USER_A, DATE, 200)
    await demoLogsService.deleteWater(USER_B, log.id)

    const stillThere = await demoLogsService.listWaterForDate(USER_A, DATE)
    expect(stillThere).toHaveLength(1)
  })

  it('upsertWeight replaces the entry for the same day instead of duplicating it', async () => {
    await demoLogsService.upsertWeight(USER_A, DATE, 80, null)
    await demoLogsService.upsertWeight(USER_A, DATE, 79.5, null)

    const range = await demoLogsService.listWeightInRange(USER_A, DATE, DATE)
    expect(range).toHaveLength(1)
    expect(range[0].weightKg).toBe(79.5)
  })
})

describe('demoMealsService — duplicate-save prevention', () => {
  beforeEach(() => {
    resetDemoData()
  })

  it('creating a meal twice from the same planned meal on the same date does not duplicate it', async () => {
    const plannedMealId = 'planned-1'
    const input = {
      mealDate: DATE,
      mealTime: '08:00',
      mealType: 'breakfast' as const,
      note: null,
      items: [{ foodName: 'יוגורט', quantity: 1, unit: 'יחידה' }],
      sourcePlannedMealId: plannedMealId,
    }

    const first = await demoMealsService.createMeal(USER_A, input)
    const second = await demoMealsService.createMeal(USER_A, input)

    expect(second.id).toBe(first.id)

    const mealsForDate = await demoMealsService.listMealsForDate(USER_A, DATE)
    const fromThisPlan = mealsForDate.filter((m) => m.sourcePlannedMealId === plannedMealId)
    expect(fromThisPlan).toHaveLength(1)
  })
})
