import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { supabase } from '../supabaseClient.js'

const TABS = [
  {
    path: '/app/training',
    label: 'Training',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    path: '/app/nutrition',
    label: 'Nutrition',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    path: '/app/injury',
    label: 'Body',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    path: '/app/log',
    label: 'Log',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
]

export default function AppLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profileChecked, setProfileChecked] = useState(false)

  useEffect(() => {
    if (!user) return

    supabase
      .from('user_profiles')
      .select('id, onboarding_complete')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || !data.onboarding_complete) {
          navigate('/onboarding', { replace: true })
        } else {
          setProfileChecked(true)
        }
      })
  }, [user])

  if (!profileChecked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 safe-area-inset-bottom">
        <div className="flex max-w-lg mx-auto">
          {TABS.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
                }`
              }
            >
              {tab.icon}
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
