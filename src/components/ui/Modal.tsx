import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { X } from './icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

const EASE = [0.32, 0.72, 0, 1] as const

// מתחת ל-640px (Tailwind sm) הטופס מוצג כ-bottom sheet אמיתי (החלקה אנכית),
// מעל 640px כמודאל ממורכז — כניסה/יציאה א-סימטריות: 280ms כניסה, 200ms יציאה.
const SHEET_ENTER_MS = 280
const SHEET_EXIT_MS = 200
const DIALOG_ENTER_MS = 250
const DIALOG_EXIT_MS = 200

const SHEET_VARIANTS = {
  initial: { opacity: 0, y: '100%' },
  animate: { opacity: 1, y: 0, transition: { duration: SHEET_ENTER_MS / 1000, ease: EASE } },
  exit: { opacity: 0, y: '100%', transition: { duration: SHEET_EXIT_MS / 1000, ease: EASE } },
}

const DIALOG_VARIANTS = {
  initial: { opacity: 0, y: 28, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: DIALOG_ENTER_MS / 1000, ease: EASE } },
  exit: { opacity: 0, y: 28, scale: 0.98, transition: { duration: DIALOG_EXIT_MS / 1000, ease: EASE } },
}

// MotionConfig reducedMotion="user" לא כיבה כראוי אנימציית transform בתוך variants
// עם transition מוטמע (נבדק בפועל: ה-sheet נשאר תקוע ב-opacity:0 לצמיתות) — לכן
// כשמזוהה prefers-reduced-motion, המודאל עובר ידנית לגרסת opacity-בלבד, ללא הזזה.
const REDUCED_SHEET_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: SHEET_ENTER_MS / 1000 } },
  exit: { opacity: 0, transition: { duration: SHEET_EXIT_MS / 1000 } },
}

const REDUCED_DIALOG_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DIALOG_ENTER_MS / 1000 } },
  exit: { opacity: 0, transition: { duration: DIALOG_EXIT_MS / 1000 } },
}

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    const onChange = () => setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// בבדיקות בסביבה הזו AnimatePresence לפעמים לא הסיר את האלמנט אחרי סיום ה-exit
// (נשאר ב-DOM עם pointer-events פעילים וחוסם קליקים) — לא ברור אם זו התנהגות
// אמיתית של הספרייה או ארטיפקט של סביבת הבדיקה. בכל מקרה, הסרה מה-DOM בטיימר
// עצמאי (לא תלוי בקולבק exit-complete) היא הדפוס הבטוח יותר, ולכן נשמרה.
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const isMobile = useIsMobileViewport()
  const prefersReducedMotion = useReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(open)
  const exitMs = isMobile ? SHEET_EXIT_MS : DIALOG_EXIT_MS
  const variants = prefersReducedMotion
    ? isMobile
      ? REDUCED_SHEET_VARIANTS
      : REDUCED_DIALOG_VARIANTS
    : isMobile
      ? SHEET_VARIANTS
      : DIALOG_VARIANTS

  useEffect(() => {
    if (open) {
      // נלכד *לפני* שהתוכן פנימי מותקן (ולא בשלב הפוקוס בהמשך), כדי לא לתפוס
      // בטעות שדה שקיבל autoFocus טבעי בתוך הטופס במקום האלמנט שהפעיל את הפתיחה.
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null
      setMounted(true)
      return
    }
    const timer = setTimeout(() => setMounted(false), exitMs)
    return () => clearTimeout(timer)
  }, [open, exitMs])

  // Escape לסגירה + מלכודת פוקוס (Tab/Shift+Tab לא בורחים מהדיאלוג) + נעילת גלילת הרקע.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null,
      )
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  // inert על תוכן האפליקציה מאחורי המודאל — קורא מסך/מקלדת לא "בורחים" אליו.
  useEffect(() => {
    if (!open) return
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    return () => root?.removeAttribute('inert')
  }, [open])

  // פוקוס ראשוני: אלמנט עם data-autofocus אם יש (למשל שם המזון בטופס ארוחה), אחרת
  // כותרת המודאל — לעולם לא "הראשון שנמצא ב-DOM" (זה מה שתפס בטעות את "הוספת תמונה").
  // אם שדה כבר תפס פוקוס בעצמו (autoFocus טבעי של React), לא דורסים אותו.
  useEffect(() => {
    if (!open || !mounted) return
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) {
      const explicit = dialog.querySelector<HTMLElement>('[data-autofocus]')
      ;(explicit ?? titleRef.current)?.focus()
    }
    return () => previouslyFocusedRef.current?.focus()
  }, [open, mounted])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <motion.div
        className="absolute inset-0 bg-ink-900/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: exitMs / 1000 }}
        onClick={onClose}
      />
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-card bg-white shadow-pop outline-none sm:max-h-[85dvh] sm:max-w-lg sm:rounded-card"
        variants={variants}
        initial="initial"
        animate={open ? 'animate' : 'exit'}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 ref={titleRef} tabIndex={-1} className="text-subtitle text-ink-900 outline-none">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-bg hover:text-ink-900"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  )
}
