import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../lib/i18n.jsx'
import { supabase } from '../supabaseClient.js'

const TABS = [
  {
    path: '/app/training',
    labelKey: 'nav.training',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    path: '/app/nutrition',
    labelKey: 'nav.nutrition',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    path: '/app/injury',
    labelKey: 'nav.body',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    path: '/app/log',
    labelKey: 'nav.log',
    icon: (active) => (
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
  const location = useLocation()
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
      <motion.button
        onClick={toggleLang}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
        className="fixed top-4 left-4 z-50 px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 shadow-sm transition-colors"
      >
        {lang === 'en' ? '中文' : 'EN'}
      </motion.button>

      <div className="flex-1 overflow-y-auto pb-20">
        <div key={location.pathname} className="min-h-full tab-enter">
          <Outlet />
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-zinc-200 safe-area-inset-bottom">
        <div className="flex max-w-lg mx-auto items-stretch relative">
          {TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className="flex-1"
            >
              {({ isActive }) => (
                <motion.div
                  className={`flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
                    isActive ? 'text-orange-500' : 'text-zinc-400'
                  }`}
                  whileTap={{ scale: 0.78 }}
                  transition={{ type: 'spring', stiffness: 700, damping: 18 }}
                >
                  <motion.div
                    animate={{
                      scale: isActive ? 1.18 : 1,
                      y: isActive ? -2 : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                  >
                    {tab.icon(isActive)}
                  </motion.div>
                  <motion.span
                    animate={{ opacity: isActive ? 1 : 0.6 }}
                    transition={{ duration: 0.15 }}
                  >
                    {t(tab.labelKey)}
                  </motion.span>
                  {isActive && (
                    <motion.div
                      layoutId="tab-dot"
                      className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-500"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
