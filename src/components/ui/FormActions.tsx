import type { ReactNode } from 'react'

// פס פעולות שנדבק לתחתית אזור הגלילה של המודאל, כך שכפתור השמירה נשאר
// נגיש תמיד ולא מוסתר על ידי המקלדת בנייד.
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky -bottom-4 -mx-5 mt-5 flex justify-end gap-2 border-t border-border bg-white/97 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      {children}
    </div>
  )
}
