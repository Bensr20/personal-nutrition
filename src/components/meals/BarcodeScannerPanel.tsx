import { useEffect, useRef, useState } from 'react'
import { BrowserCodeReader, BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library'
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

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: 'environment',
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
}

// אזור הסריקה בפועל (ROI) כאחוז מהפריים המלא, תואם ויזואלית למסגרת הכיוון על המסך.
//
// הגרסה הקודמת סרקה את הפריים המלא (1920x1080) עם TRY_HARDER — כל ניסיון פענוח היה
// איטי, ולכן היו מעט ניסיונות בשנייה. בפועל זה הרגיש כאילו המצלמה "רק מסתכלת" בלי
// לזהות: לתפוס ברקוד עם מעט מאוד ניסיונות איטיים דורש שהפריים היחיד שכן נבדק יהיה
// גם חד וגם ממורכז בול. הפתרון שמשתמשים בו סורקי ברקוד אמיתיים: לחתוך רק אזור קטן
// במרכז (בעל רזולוציה מספקת כי הצילום המקורי באיכות גבוהה) ולהריץ עליו הרבה ניסיונות
// מהירים ברצף — כך יש הרבה יותר "הזדמנויות תפיסה" בשנייה במקום מעט איטיות.
const ROI_WIDTH_RATIO = 0.85
const ROI_HEIGHT_RATIO = 0.32
const SCAN_INTERVAL_MS = 100

export function BarcodeScannerPanel({ active, onDetected, onManualEntry }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastDetectedRef = useRef<string | null>(null)
  const [permissionState, setPermissionState] = useState<PermissionState>('requesting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  // דיאגנוסטיקה על המסך: attempts עולה אם ניסיונות פענוח בכלל רצים; video מראה את הרזולוציה
  // שהמצלמה סיפקה בפועל (לא בהכרח מה שביקשנו כ-ideal).
  const [debugInfo, setDebugInfo] = useState({ attempts: 0, videoSize: '', lastError: '' })

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let rafId = 0
    let timeoutId = 0
    lastDetectedRef.current = null
    setPermissionState('requesting')
    setErrorMessage(null)
    setTorchSupported(false)
    setTorchOn(false)
    setDebugInfo({ attempts: 0, videoSize: '', lastError: '' })

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, POSSIBLE_FORMATS)
    hints.set(DecodeHintType.TRY_HARDER, true)
    const reader = new BrowserMultiFormatReader(hints)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    let attempts = 0

    function scheduleNext(fn: () => void) {
      // requestAnimationFrame מושהה כשהטאב לא גלוי; timeout רגיל מבטיח שהלולאה תמשיך
      // גם אם הדפדפן מעדיף לצייר פחות, ומאפשר לנו לקצב את הקצב בעצמנו (SCAN_INTERVAL_MS).
      timeoutId = window.setTimeout(() => {
        rafId = requestAnimationFrame(fn)
      }, SCAN_INTERVAL_MS)
    }

    function attemptDecode() {
      if (cancelled) return
      const video = videoRef.current
      if (!video || video.videoWidth === 0 || !ctx) {
        scheduleNext(attemptDecode)
        return
      }
      const vw = video.videoWidth
      const vh = video.videoHeight
      const roiW = Math.round(vw * ROI_WIDTH_RATIO)
      const roiH = Math.round(vh * ROI_HEIGHT_RATIO)
      const sx = Math.round((vw - roiW) / 2)
      const sy = Math.round((vh - roiH) / 2)
      canvas.width = roiW
      canvas.height = roiH
      ctx.drawImage(video, sx, sy, roiW, roiH, 0, 0, roiW, roiH)

      attempts++
      if (attempts % 5 === 0) {
        setDebugInfo((d) => ({ attempts, videoSize: `${vw}x${vh}`, lastError: d.lastError }))
      }

      try {
        const result = reader.decodeFromCanvas(canvas)
        const text = result.getText()
        // מניעת זיהוי כפול לאותו ברקוד ברצף (עד שסוגרים/סורקים מוצר אחר).
        if (text !== lastDetectedRef.current) {
          lastDetectedRef.current = text
          stopStream()
          onDetected(text)
          return
        }
      } catch (err) {
        // NotFoundException על אזור בלי ברקוד ברור זה המצב הרגיל בכל ניסיון שלא מצליח — לא שגיאה.
        // סוג אחר (לא צפוי) עדיין לא עוצר את הסריקה, רק מוצג בדיאגנוסטיקה למקרה שיש בעיה אמיתית.
        if (!(err instanceof NotFoundException) && attempts % 5 === 0) {
          setDebugInfo((d) => ({ ...d, lastError: err instanceof Error ? err.constructor.name : String(err) }))
        }
      }
      scheduleNext(attemptDecode)
    }

    function stopStream() {
      window.clearTimeout(timeoutId)
      cancelAnimationFrame(rafId)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play().catch(() => {})
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        setPermissionState('granted')
        setTorchSupported(BrowserCodeReader.mediaStreamIsTorchCompatible(stream))

        attemptDecode()
      } catch (err) {
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
      }
    })()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      cancelAnimationFrame(rafId)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  async function toggleTorch() {
    const stream = streamRef.current
    const track = stream?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    try {
      await BrowserCodeReader.mediaStreamSetTorch(track, next)
      setTorchOn(next)
    } catch {
      // פנס לא נתמך בפועל למרות שהמכשיר הצהיר על תמיכה - מתעלמים, הכפתור פשוט לא יעשה כלום.
    }
  }

  if (!active) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-control bg-ink-900">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline aria-hidden />
        {permissionState === 'granted' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div
              className="rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
              style={{ width: `${ROI_WIDTH_RATIO * 100}%`, height: `${ROI_HEIGHT_RATIO * 100}%` }}
            />
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

      {permissionState === 'granted' && (
        <p className="text-center font-mono text-micro text-ink-400" dir="ltr">
          attempts: {debugInfo.attempts} · video: {debugInfo.videoSize || '?'}
          {debugInfo.lastError && ` · err: ${debugInfo.lastError}`}
        </p>
      )}

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
