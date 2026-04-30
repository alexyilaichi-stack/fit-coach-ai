import { useLanguage } from '../lib/i18n.jsx'

export default function InjuryEntry({ entry }) {
  const { t } = useLanguage()
  const date = new Date(entry.logged_at || entry.created_at)
  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const isActive = entry.is_active

  return (
    <div className={`flex items-start justify-between gap-3 py-3 border-b border-zinc-100 last:border-0 ${isActive ? '' : 'opacity-60'}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-800 leading-relaxed">{entry.description}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
      </div>
      <span className={`shrink-0 mt-0.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        isActive ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500'
      }`}>
        {isActive ? t('body.active') : t('body.resolved')}
      </span>
    </div>
  )
}
