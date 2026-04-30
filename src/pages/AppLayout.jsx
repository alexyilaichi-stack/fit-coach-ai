import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../lib/i18n.jsx'
import { supabase } from '../supabaseClient.js'

const TABS = [
  {
    path: '/app/training',
    labelKey: 'nav.training',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    path: '/app/nutrition',
    labelKey: 'nav.nutrition',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    path: '/app/injury',
    labelKey: 'nav.body',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    path: '/app/log',
    labelKey: 'nav.log',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
]

export default function AppLayout() {
  const { user } = useAuth()
  const { t, lang, toggleLang } = useLanguage()
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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Language toggle — fixed top-left, away from History button */}
      <button
        onClick={toggleLang}
        className="fixed top-4 left-4 z-50 px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 shadow-sm transition-colors"
      >
        {lang === 'en' ? '中文' : 'EN'}
      </button>

      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-zinc-200 safe-area-inset-bottom">
        <div className="flex max-w-lg mx-auto items-stretch">
          {TABS.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive ? 'text-orange-500' : 'text-zinc-400 hover:text-zinc-600'
                }`
              }
            >
              {tab.icon}
              {t(tab.labelKey)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
