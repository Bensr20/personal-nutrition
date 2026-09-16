import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import type { IScannerControls } from '@zxing/browser'
import { Button } from '@/components/ui/Button'
import { AlertCircle, Zap, ZapOff, VideoOff, Keyboard } from '@/components/ui/icons'

interface Props {
  /** מפעיל/מכבה את המצלמה בפועל — false משחרר את כל המשאבים. */
  active: boolean
  onDetected: (barcode: string) => void
  onManualEntry: () => void
}

type PermissionState = 'requesting' | 'granted' | 'error'

const POSSIBLE_FORMATS = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]

// facingMode בלבד (בלי רזולוציה) משאיר לדפדפן לבחור סטרים ברירת מחדל, שלעיתים נמוך/מטושטש מדי
// לפענוח ברקוד. מבקשים רזולוציה גבוהה ופוקוס רציף במפורש; advanced מתעלם בבטחה מאילוצים
// שהמכשיר לא תומך בהם (לא זורק שגיאה כמו אילוץ exact/mandatory היה עושה).
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: 'environment',
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
}

export function BarcodeScannerPanel({ active, onDetected, onManualEntry }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const lastDetectedRef = useRef<string | null>(null)
  const grantedAnnouncedRef = useRef(false)
  const [permissionState, setPermissionState] = useState<PermissionState>('requesting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    lastDetectedRef.current = null
    grantedAnnouncedRef.current = false
    setPermissionState('requesting')
    setErrorMessage(null)
    setTorchSupported(false)
    setTorchOn(false)

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, POSSIBLE_FORMATS)
    hints.set(DecodeHintType.TRY_HARDER, true)
    const reader = new BrowserMultiFormatReader(hints)

    reader
      .decodeFromConstraints({ video: VIDEO_CONSTRAINTS }, videoRef.current ?? undefined, (result, _err, controls) => {
        if (cancelled) {
          controls.stop()
          return
        }
        if (!grantedAnnouncedRef.current) {
          grantedAnnouncedRef.current = true
          setPermissionState('granted')
          setTorchSupported(typeof controls.switchTorch === 'function')
        }
        if (!result) return // NotFoundException על כל פריים בלי ברקוד — צפוי, לא שגיאה.
        const text = result.getText()
        // מניעת זיהוי כפול לאותו ברקוד ברצף פריימים (עד שהמשתמשת סוגרת/סורקת מוצר אחר).
        if (text === lastDetectedRef.current) return
        lastDetectedRef.current = text
        controls.stop()
        controlsRef.current = null
        onDetected(text)
      })
      .then((controls) => {
        // אם נסגר בזמן שהמתנו להרשאת המצלמה — סוגרים מיד את ה-stream שהתקבל, בלי להציג אותו.
        if (cancelled) {
          controls.stop()
          return
        }
        controlsRef.current = controls
        if (!grantedAnnouncedRef.current) {
          grantedAnnouncedRef.current = true
          setPermissionState('granted')
          setTorchSupported(typeof controls.switchTorch === 'function')
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setPermissionState('error')
        const name = err instanceof Error ? err.name : ''
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setErrorMessage('הגישה למצלמה נדחתה. אפשר להזין את הברקוד ידנית במקום.')
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorMessage('לא נמצאה מצלמה במכשיר הזה. אפשר להזין את הברקוד ידנית.')
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setErrorMessage('המצלמה תפוסה על ידי אפליקציה אחרת. סגרו אותה ונסו שוב, או הזינו ברקוד ידנית.')
        } else {
          setErrorMessage('לא ניתן להפעיל את המצלמה. אפשר להזין את הברקוד ידנית.')
        }
      })

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  async function toggleTorch() {
    const controls = controlsRef.current
    if (!controls?.switchTorch) return
    const next = !torchOn
    await controls.switchTorch(next)
    setTorchOn(next)
  }

  if (!active) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-control bg-ink-900">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline aria-hidden />
        {permissionState === 'granted' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="h-28 w-4/5 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            <p className="rounded-full bg-black/50 px-3 py-1 text-caption font-medium text-white">
              כוונו את הברקוד למסגרת, כ-10 ס״מ מהמצלמה, באור טוב וללא תזוזה
            </p>
          </div>
        )}
        {permissionState === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center text-caption text-white/80">מבקש הרשאת מצלמה…</div>
        )}
        {permissionState === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <VideoOff className="h-8 w-8 text-white/70" aria-hidden />
          </div>
        )}
        {torchSupported && permissionState === 'granted' && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-label={torchOn ? 'כיבוי פנס' : 'הדלקת פנס'}
            className="absolute bottom-3 start-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            {torchOn ? <ZapOff className="h-5 w-5" aria-hidden /> : <Zap className="h-5 w-5" aria-hidden />}
          </button>
        )}
      </div>

      {errorMessage && (
        <p className="flex items-center gap-1.5 text-caption font-medium text-coral-600" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {errorMessage}
        </p>
      )}

      <Button type="button" variant="secondary" size="md" onClick={onManualEntry} className="self-center">
        <Keyboard className="h-4 w-4" aria-hidden />
        הזנת ברקוד ידנית במקום
      </Button>
    </div>
  )
}
