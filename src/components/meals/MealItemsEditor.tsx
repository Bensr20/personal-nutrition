import { useState, type ReactNode } from 'react'
import type { MealItemInput } from '@/types/domain'
import { Button } from '@/components/ui/Button'
import { Plus, X, Search, Flame } from '@/components/ui/icons'
import { computeMealTotals, roundForDisplay } from '@/lib/nutritionCalc'
import { parseFoodText, type ParsedFoodText } from '@/lib/foodTextParser'
import { FoodPickerModal } from './FoodPickerModal'

interface Props {
  items: MealItemInput[]
  onChange: (items: MealItemInput[]) => void
  headerAction?: ReactNode
}

const UNIT_OPTIONS = ['גרם', 'מ"ל', 'יחידה', 'כוס', 'כף', 'כפית', 'פרוסה', 'קערה']

const inputClass =
  'h-11 min-w-0 rounded-control border border-ink-200 bg-white px-3 text-body text-ink-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400'

export function MealItemsEditor({ items, onChange, headerAction }: Props) {
  const [pickerTarget, setPickerTarget] = useState<number | 'append' | null>(null)
  const [quickText, setQuickText] = useState('')
  const [quickParsed, setQuickParsed] = useState<ParsedFoodText | null>(null)

  // עריכת כמות על פריט עם צילום מצב תזונתי מחשבת יחסית לצילום השמור (ליטרל gramsPerUnit קבוע),
  // ולא פונה שוב למקור הנתונים. שינוי היחידה בשדה החופשי (לא דרך חיפוש) מבטל את הצילום —
  // אין דרך לדעת את משקל היחידה החדשה בלי לחזור למאגר, ולכן עדיף לאבד את הקלוריות מאשר להציג שווא.
  function update(index: number, patch: Partial<MealItemInput>) {
    onChange(
      items.map((it, i) => {
        if (i !== index) return it
        if ('unit' in patch && patch.unit !== it.unit && it.nutrition) {
          return { ...it, ...patch, foodRef: null, unitCode: null, amountGrams: null, nutrition: null }
        }
        if ('quantity' in patch && patch.quantity != null && it.nutrition && it.amountGrams && it.quantity > 0) {
          const ratio = patch.quantity / it.quantity
          const scaled = it.amountGrams * ratio
          const n = it.nutrition
          return {
            ...it,
            ...patch,
            amountGrams: scaled,
            nutrition: {
              kcal: n.kcal == null ? null : n.kcal * ratio,
              proteinG: n.proteinG == null ? null : n.proteinG * ratio,
              carbsG: n.carbsG == null ? null : n.carbsG * ratio,
              fatG: n.fatG == null ? null : n.fatG * ratio,
              isPartial: n.isPartial,
            },
          }
        }
        return { ...it, ...patch }
      }),
    )
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...items, { foodName: '', quantity: 1, unit: 'יחידה' }])
  }

  function handlePicked(item: MealItemInput) {
    if (pickerTarget === 'append' || pickerTarget === null) {
      onChange([...items, item])
    } else {
      update(pickerTarget, item)
    }
    setPickerTarget(null)
    setQuickParsed(null)
    setQuickText('')
  }

  function handleQuickParse() {
    if (!quickText.trim()) return
    const parsed = parseFoodText(quickText)
    setQuickParsed(parsed)
    setPickerTarget('append')
  }

  const totals = computeMealTotals(items)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-caption font-semibold text-ink-700">פריטי מזון</span>
        {headerAction}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={quickText}
          onChange={(e) => setQuickText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleQuickParse()
            }
          }}
          placeholder='למשל: "חצי גביע קוטג׳ תנובה 5%"'
          aria-label="הוספה מהירה בטקסט חופשי"
          className={`${inputClass} flex-1`}
        />
        <Button type="button" variant="secondary" size="md" onClick={handleQuickParse} disabled={!quickText.trim()}>
          הוספה מהירה
        </Button>
      </div>

      {items.length === 0 && <p className="text-caption text-ink-400">לא נוספו פריטים עדיין</p>}
      <div className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <div key={i} className="rounded-control border border-border bg-bg p-2.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={item.foodName}
                onChange={(e) => update(i, { foodName: e.target.value })}
                placeholder="שם המזון"
                aria-label="שם המזון"
                data-autofocus={i === 0 ? '' : undefined}
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => setPickerTarget(i)}
                aria-label="חיפוש מהמאגר"
                title="חיפוש מהמאגר / ברקוד"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
              >
                <Search className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="הסרת פריט"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-400 transition-colors hover:bg-coral-50 hover:text-coral-600"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={item.quantity}
                onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                aria-label="כמות"
                className={`${inputClass} w-20 text-center tabular-nums`}
              />
              <select
                value={item.unit}
                onChange={(e) => update(i, { unit: e.target.value })}
                aria-label="יחידה"
                className={`${inputClass} flex-1`}
              >
                {/* יחידה שהגיעה מהמאגר (כמו "גביע") ולא נמצאת ברשימת הבסיס עדיין מוצגת נכון, ולא נופלת בשקט לאפשרות הראשונה */}
                {(UNIT_OPTIONS.includes(item.unit) ? UNIT_OPTIONS : [item.unit, ...UNIT_OPTIONS]).map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            {item.nutrition && (
              <p className="mt-1.5 flex items-center gap-1 text-caption text-ink-500 tabular-nums">
                <Flame className="h-3.5 w-3.5" aria-hidden />
                {item.nutrition.kcal != null ? `${roundForDisplay(item.nutrition.kcal)} קק״ל` : 'אין נתון קלוריות'}
                {item.nutrition.isPartial && ' · חלקי'}
              </p>
            )}
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" size="md" onClick={add} className="self-start">
        <Plus className="h-4 w-4" aria-hidden />
        הוספת פריט ידנית
      </Button>

      {totals.hasAnyNutrition && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-control bg-primary-50 px-3.5 py-2.5 text-caption font-semibold text-ink-800 tabular-nums">
          <span className="flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-primary-600" aria-hidden />
            {roundForDisplay(totals.kcal)} קק״ל{totals.isPartial && ' (חלקי)'}
          </span>
          <span className="font-normal text-ink-600">חלבון {roundForDisplay(totals.proteinG)} ג׳</span>
          <span className="font-normal text-ink-600">פחמימות {roundForDisplay(totals.carbsG)} ג׳</span>
          <span className="font-normal text-ink-600">שומן {roundForDisplay(totals.fatG)} ג׳</span>
        </div>
      )}

      <FoodPickerModal
        open={pickerTarget !== null}
        onClose={() => {
          setPickerTarget(null)
          setQuickParsed(null)
        }}
        onSelect={handlePicked}
        initialParsed={quickParsed}
      />
    </div>
  )
}
