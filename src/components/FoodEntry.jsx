export default function FoodEntry({ entry }) {
  const time = entry.logged_at
    ? new Date(entry.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-zinc-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 truncate">{entry.description}</p>
        {time && <p className="text-xs text-zinc-400 mt-0.5">{time}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0 text-right">
        <div className="text-right">
          <p className="text-sm font-semibold text-zinc-800">{entry.calories}</p>
          <p className="text-xs text-zinc-400">kcal</p>
        </div>
        <div className="flex gap-2 text-xs text-zinc-500">
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-medium">{entry.protein_g}P</span>
          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md font-medium">{entry.carbs_g}C</span>
          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-md font-medium">{entry.fat_g}F</span>
        </div>
      </div>
    </div>
  )
}
