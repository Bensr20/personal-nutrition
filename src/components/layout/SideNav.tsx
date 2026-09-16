import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navItems'
import { Leaf, Settings } from '@/components/ui/icons'

export function SideNav() {
  return (
    <nav className="fixed inset-y-0 right-0 hidden w-64 flex-col border-l border-border bg-white p-5 sm:flex" aria-label="ניווט ראשי">
      <div className="mb-8 flex items-center gap-2.5 px-1.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-white" aria-hidden>
          <Leaf className="h-5 w-5" />
        </span>
        <span className="text-subtitle text-ink-900">התזונה שלי</span>
      </div>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-control px-3.5 py-3 text-body font-semibold transition-colors',
                  isActive ? 'bg-primary-50 text-primary-600' : 'text-ink-500 hover:bg-bg hover:text-ink-800',
                ].join(' ')
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-auto">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-control px-3.5 py-3 text-body font-semibold transition-colors',
              isActive ? 'bg-primary-50 text-primary-600' : 'text-ink-500 hover:bg-bg hover:text-ink-800',
            ].join(' ')
          }
        >
          <Settings className="h-[18px] w-[18px]" />
          הגדרות
        </NavLink>
      </div>
    </nav>
  )
}
