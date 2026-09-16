import { lazy, Suspense, useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { FormActions } from '@/components/ui/FormActions'
import { Spinner, EmptyState } from '@/components/ui/Misc'
import { Search, ScanBarcode, AlertCircle, Flame } from '@/components/ui/icons'
import { foodCatalogService } from '@/services'
import { sanitizeBarcode } from '@/services/foods/offClient'
import { resolveProductByBarcode, OffError } from '@/services/foods/barcodeResolver'
import { listSelectableUnits, findUnit, resolveAmountGrams, GRAMS_UNIT } from '@/services/foods/unitConversion'
import { computeItemNutrition, roundForDisplay } from '@/lib/nutritionCalc'
import type { ParsedFoodText } from '@/lib/foodTextParser'
import type { FoodCatalogItem, FoodSearchResult } from '@/services/foods/foodTypes'
import type { MealItemInput } from '@/types/domain'
import { useAuth } from '@/context/AuthContext'

// ספריית הסריקה (@zxing) נטענת רק כשמשתמשים בפועל בסריקת ברקוד (chunk נפרד, ~700KB) —
// כדי לא להכביד על טעינת האפליקציה הראשונית עבור מי שלא סורק כלל.
const BarcodeScannerPanel = lazy(() => import('./BarcodeScannerPanel').then((m) => ({ default: m.BarcodeScannerPanel })))

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (item: MealItemInput) => void
  /** ניחוש מהפענוח החופשי (סעיף 6 במפרט) — משמש להצעת מוצר תואם, אך תמיד דורש אישור המשתמש בשלב הכמות. */
  initialParsed?: ParsedFoodText | null
}

type Step = 'search' | 'quantity' | 'manual' | 'scan'

const DEBOUNCE_MS = 250
// התאמה חד-משמעית רק כשיש תוצאה אחת מובהקת בהרבה מהשנייה — אחרת מוצג חיפוש מובנה לבחירה (למשל "לאבנה גד" עמום).
const AUTO_MATCH_MIN_SCORE = 0.6
const AUTO_MATCH_MARGIN = 0.15

function buildSearchText(parsed: ParsedFoodText): string {
  const parts = [parsed.brand, parsed.foodNameGuess]
  if (parsed.fatPercent != null) parts.push(`${parsed.fatPercent}%`)
  return parts.filter(Boolean).join(' ')
}

function emptyManualForm() {
  return { displayName: '', brand: '', kcal: '', protein: '', carbs: '', fat: '' }
}

export function FoodPickerModal({ open, onClose, onSelect, initialParsed }: Props) {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [results, setResults] = useState<FoodSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<FoodCatalogItem | null>(null)
  const [unitCode, setUnitCode] = useState('g')
  const [gramsPerUnit, setGramsPerUnit] = useState(1)
  const [quantity, setQuantity] = useState(1)
  const [manualForm, setManualForm] = useState(emptyManualForm())

  useEffect(() => {
    if (!open) {
      setStep('search')
      setQuery('')
      setBarcodeInput('')
      setResults([])
      setError(null)
      setSelected(null)
      setManualForm(emptyManualForm())
      return
    }
    if (!user || !initialParsed || !initialParsed.confident) {
      if (initialParsed) {
        setQuery(initialParsed.foodNameGuess ? buildSearchText(initialParsed) : initialParsed.raw)
      }
      return
    }
    const searchText = buildSearchText(initialParsed)
    setQuery(searchText)
    foodCatalogService.search(user.id, searchText, 5).then((matches) => {
      const [best, second] = matches
      const isAutoMatch = best && best.score >= AUTO_MATCH_MIN_SCORE && (!second || best.score - second.score >= AUTO_MATCH_MARGIN)
      if (!isAutoMatch) return
      selectWithParsedQuantity(best.item, initialParsed)
      setStep('quantity')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open || !user || step !== 'search') return
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(() => {
      foodCatalogService
        .search(user.id, trimmed)
        .then((r) => setResults(r))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, open, user, step])

  /** בוחר יחידה/כמות לפי הפענוח החופשי כשקיים (למשל "חצי גביע") — עדיין מציג את שלב הכמות לאישור. */
  function selectWithParsedQuantity(item: FoodCatalogItem, parsed: ParsedFoodText) {
    setSelected(item)
    const unit = parsed.unitLabel ? item.units.find((u) => u.labelHe === parsed.unitLabel) : null
    setUnitCode(unit?.code ?? 'g')
    setGramsPerUnit(unit?.grams ?? 1)
    setQuantity(parsed.quantity ?? (unit ? 1 : 100))
    setError(null)
  }

  function pickItem(item: FoodCatalogItem) {
    if (initialParsed?.confident) {
      selectWithParsedQuantity(item, initialParsed)
    } else {
      setSelected(item)
      setUnitCode('g')
      setGramsPerUnit(1)
      setQuantity(100)
      setError(null)
    }
    setStep('quantity')
  }

  /**
   * שולף מוצר לפי ברקוד (הזנה ידנית או סריקה, ראו סדר עדיפויות ב-barcodeResolver) ומעביר לשלב
   * הכמות לאישור. תקלת רשת/timeout אינה מסווגת כ"לא נמצא" — רק תשובת שרת מפורשת עושה זאת.
   */
  async function resolveAndProceed(rawCode: string) {
    if (!user) return
    setStep('search')
    setBarcodeInput(rawCode)
    setError(null)
    setBarcodeLoading(true)
    try {
      const item = await resolveProductByBarcode(foodCatalogService, user.id, rawCode)
      pickItem(item)
    } catch (err) {
      if (err instanceof OffError && err.kind === 'not_found') {
        setManualForm((f) => ({ ...f, displayName: '' }))
        setStep('manual')
      }
      setError(err instanceof Error ? err.message : 'שליפת המוצר נכשלה, נסו שוב')
    } finally {
      setBarcodeLoading(false)
    }
  }

  async function handleBarcodeSubmit() {
    setError(null)
    const sanitized = sanitizeBarcode(barcodeInput)
    if (!sanitized) {
      setError('ברקוד לא תקין — יש לוודא שהוא EAN-13, EAN-8 או UPC-A תקין')
      return
    }
    await resolveAndProceed(sanitized)
  }

  const units = selected ? listSelectableUnits(selected) : [GRAMS_UNIT]

  function handleUnitChange(code: string) {
    setUnitCode(code)
    const unit = selected ? findUnit(selected, code) : null
    setGramsPerUnit(unit?.grams ?? 1)
  }

  const amountGrams = selected ? resolveAmountGrams(quantity, gramsPerUnit) : 0
  const preview = selected ? computeItemNutrition(selected.per100, amountGrams) : null

  function confirmQuantity() {
    if (!selected) return
    const unit = units.find((u) => u.code === unitCode)
    const nameParts = [selected.brand, selected.displayNameHe].filter(Boolean)
    onSelect({
      foodName: nameParts.join(' — '),
      quantity,
      unit: unit?.labelHe ?? 'גרם',
      foodRef: { source: selected.source, sourceId: selected.sourceId, brand: selected.brand, barcode: selected.barcode },
      unitCode,
      amountGrams,
      nutrition: preview,
    })
    onClose()
  }

  async function handleManualSave() {
    if (!user) return
    setError(null)
    if (!manualForm.displayName.trim()) {
      setError('נא להזין שם מוצר')
      return
    }
    const toNum = (s: string) => (s.trim() === '' ? null : Number(s))
    try {
      const item = await foodCatalogService.addUserFood(user.id, {
        displayName: manualForm.displayName.trim(),
        brand: manualForm.brand.trim() || null,
        barcode: sanitizeBarcode(barcodeInput),
        kcalPer100: toNum(manualForm.kcal),
        proteinPer100: toNum(manualForm.protein),
        carbsPer100: toNum(manualForm.carbs),
        fatPer100: toNum(manualForm.fat),
      })
      pickItem(item)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה')
    }
  }

  const title =
    step === 'search' ? 'חיפוש מזון' : step === 'manual' ? 'השלמת מוצר חסר' : step === 'scan' ? 'סריקת ברקוד' : 'כמות ויחידה'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {step === 'scan' && (
        <Suspense fallback={<Spinner />}>
          <BarcodeScannerPanel active={step === 'scan'} onDetected={resolveAndProceed} onManualEntry={() => setStep('search')} />
        </Suspense>
      )}

      {step === 'search' && (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש מזון, למשל קוטג' תנובה"
              aria-label="חיפוש מזון"
              className="h-12 w-full rounded-control border border-ink-200 bg-white ps-10 pe-4 text-body text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
            />
          </div>

          <div className="flex flex-col gap-2 rounded-control border border-dashed border-ink-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-ink-600">או ברקוד</span>
              <button
                type="button"
                onClick={() => setStep('scan')}
                className="flex items-center gap-1 text-caption font-semibold text-primary-600 transition-colors hover:text-primary-700"
              >
                <ScanBarcode className="h-4 w-4" aria-hidden />
                סריקת ברקוד במצלמה
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5 shrink-0 text-ink-400" aria-hidden />
              <input
                type="text"
                inputMode="numeric"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="או הקלידו/הדביקו ברקוד"
                aria-label="ברקוד"
                className="h-11 min-w-0 flex-1 rounded-control border border-ink-200 bg-white px-3 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
              />
              <Button type="button" variant="secondary" size="md" loading={barcodeLoading} onClick={handleBarcodeSubmit}>
                חיפוש
              </Button>
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-caption font-medium text-coral-600" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          {searching && <Spinner />}

          {!searching && query.trim().length > 0 && results.length === 0 && (
            <EmptyState
              title="לא נמצאו תוצאות"
              description="אפשר לנסות ניסוח אחר, לחפש לפי ברקוד, או להשלים את המוצר ידנית מהתווית"
              action={
                <Button type="button" variant="secondary" onClick={() => setStep('manual')}>
                  השלמת מוצר חסר
                </Button>
              }
            />
          )}

          {!searching && results.length > 0 && (
            <ul className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto">
              {results.map((r) => (
                <li key={r.item.id}>
                  <button
                    type="button"
                    onClick={() => pickItem(r.item)}
                    className="flex w-full items-center justify-between gap-2 rounded-control border border-border bg-white px-3.5 py-2.5 text-start transition-colors hover:border-primary-300 hover:bg-primary-50"
                  >
                    <span className="flex flex-col">
                      <span className="text-body font-medium text-ink-900">{r.item.displayNameHe}</span>
                      {r.item.brand && <span className="text-caption text-ink-500">{r.item.brand}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-caption text-ink-500 tabular-nums">
                      <Flame className="h-3.5 w-3.5" aria-hidden />
                      {r.item.per100.kcal != null ? `${roundForDisplay(r.item.per100.kcal)} ל-100 גרם` : 'אין נתון'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {step === 'manual' && (
        <div className="flex flex-col gap-3">
          <p className="text-caption text-ink-500">הזינו את הערכים מהתווית התזונתית (ל-100 גרם). המוצר יישמר פרטית עבורכם בלבד.</p>
          <Input
            label="שם המוצר"
            required
            value={manualForm.displayName}
            onChange={(e) => setManualForm((f) => ({ ...f, displayName: e.target.value }))}
          />
          <Input label="מותג" hint="אופציונלי" value={manualForm.brand} onChange={(e) => setManualForm((f) => ({ ...f, brand: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="קק״ל ל-100 גרם"
              type="number"
              inputMode="decimal"
              value={manualForm.kcal}
              onChange={(e) => setManualForm((f) => ({ ...f, kcal: e.target.value }))}
            />
            <Input
              label="חלבון (גרם)"
              type="number"
              inputMode="decimal"
              value={manualForm.protein}
              onChange={(e) => setManualForm((f) => ({ ...f, protein: e.target.value }))}
            />
            <Input
              label="פחמימות (גרם)"
              type="number"
              inputMode="decimal"
              value={manualForm.carbs}
              onChange={(e) => setManualForm((f) => ({ ...f, carbs: e.target.value }))}
            />
            <Input
              label="שומן (גרם)"
              type="number"
              inputMode="decimal"
              value={manualForm.fat}
              onChange={(e) => setManualForm((f) => ({ ...f, fat: e.target.value }))}
            />
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-caption font-medium text-coral-600" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setStep('search')}>
              חזרה לחיפוש
            </Button>
            <Button type="button" onClick={handleManualSave}>
              שמירה והמשך
            </Button>
          </FormActions>
        </div>
      )}

      {step === 'quantity' && selected && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {selected.imageUrl && (
              <img src={selected.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-control border border-border object-cover" />
            )}
            <div>
              <p className="text-subtitle text-ink-900">{selected.displayNameHe}</p>
              {selected.brand && <p className="text-caption text-ink-500">{selected.brand}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="כמות" type="number" inputMode="decimal" min="0" step="0.1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            <div className="flex flex-col gap-1.5">
              <span className="text-caption font-semibold text-ink-700">יחידה</span>
              <select
                value={unitCode}
                onChange={(e) => handleUnitChange(e.target.value)}
                aria-label="יחידה"
                className="h-12 w-full rounded-control border border-ink-200 bg-white px-4 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
              >
                {units.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.labelHe}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {unitCode !== 'g' && (
            <Input
              label="משקל היחידה שנלקח בחשבון (גרם)"
              hint="ניתן לשנות אם המוצר שלכם שונה מברירת המחדל"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={gramsPerUnit}
              onChange={(e) => setGramsPerUnit(Number(e.target.value))}
            />
          )}

          <div className="rounded-control bg-bg p-3.5">
            <p className="text-caption text-ink-500">
              סה״כ {roundForDisplay(amountGrams)} גרם
              {selected.per100.kcal == null && ' — אין נתון קלוריות למוצר זה'}
            </p>
            {preview && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body font-semibold text-ink-900 tabular-nums">
                <span className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-primary-500" aria-hidden />
                  {preview.kcal != null ? `${roundForDisplay(preview.kcal)} קק״ל` : '—'}
                </span>
                {preview.proteinG != null && <span className="text-caption font-normal text-ink-600">חלבון {roundForDisplay(preview.proteinG)} ג׳</span>}
                {preview.carbsG != null && <span className="text-caption font-normal text-ink-600">פחמימות {roundForDisplay(preview.carbsG)} ג׳</span>}
                {preview.fatG != null && <span className="text-caption font-normal text-ink-600">שומן {roundForDisplay(preview.fatG)} ג׳</span>}
              </div>
            )}
          </div>

          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setStep('search')}>
              חזרה
            </Button>
            <Button type="button" onClick={confirmQuantity} disabled={!(quantity > 0)}>
              הוספה לארוחה
            </Button>
          </FormActions>
        </div>
      )}
    </Modal>
  )
}
