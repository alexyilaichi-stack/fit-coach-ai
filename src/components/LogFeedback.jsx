import { useEffect, useState } from 'react'
import { useLanguage } from '../lib/i18n.jsx'

const CATEGORY_COLORS = {
  food:         'bg-emerald-100 text-emerald-800',
  injury:       'bg-amber-100 text-amber-800',
  workout:      'bg-blue-100 text-blue-800',
  apple_health: 'bg-violet-100 text-violet-800',
  other:        'bg-zinc-100 text-zinc-600',
}

export default function LogFeedback({ categories = [], aiResponse = '' }) {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className={`transition-all duration-500 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
      <div className="flex flex-wrap gap-2 mb-3">
        {categories.map((cat) => {
          const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other
          return (
            <span key={cat} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${color}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {t('feedback.' + cat)}
            </span>
          )
        })}
      </div>
      {aiResponse && (
        <p className="text-sm text-zinc-600 leading-relaxed">{aiResponse}</p>
      )}
    </div>
  )
}
