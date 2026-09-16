import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navItems'

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] sm:hidden"
      aria-label="ניווט ראשי"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex min-h-[58px] flex-col items-center justify-center gap-1 text-micro font-semibold transition-colors',
                  isActive ? 'text-primary-500' : 'text-ink-400',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="h-[21px] w-[21px]" />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
