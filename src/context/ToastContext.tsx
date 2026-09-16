import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info } from '@/components/ui/icons'

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastItem {
  id: number
  message: string
  kind: 'success' | 'error' | 'info'
  action?: ToastAction
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastItem['kind'], action?: ToastAction) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const KIND_STYLE: Record<ToastItem['kind'], { bg: string; icon: typeof CheckCircle2 }> = {
  success: { bg: 'bg-mint-600', icon: CheckCircle2 },
  error: { bg: 'bg-coral-600', icon: AlertCircle },
  info: { bg: 'bg-ink-900', icon: Info },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const showToast = useCallback((message: string, kind: ToastItem['kind'] = 'info', action?: ToastAction) => {
    const id = ++counter.current
    setToasts((prev) => [...prev, { id, message, kind, action }])
    // כאשר יש פעולת "בטל", נותנים חלון זמן ארוך יותר ללחוץ עליה לפני שהטוסט נעלם.
    setTimeout(
      () => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      },
      action ? 5000 : 3200,
    )
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6" aria-live="polite">
        {toasts.map((t) => {
          const { bg, icon: Icon } = KIND_STYLE[t.kind]
          return (
            <div
              key={t.id}
              role="status"
              className={`animate-fade-in flex w-full max-w-sm items-center gap-2 rounded-control px-4 py-3 text-body font-medium text-white shadow-pop ${bg}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick()
                    setToasts((prev) => prev.filter((x) => x.id !== t.id))
                  }}
                  className="shrink-0 rounded-control px-2 py-1 text-body font-bold underline decoration-2 underline-offset-2 hover:bg-white/15"
                >
                  {t.action.label}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast חייב לרוץ בתוך ToastProvider')
  return ctx
}
