export default function MacroBar({ label, current = 0, target = 0, unit = 'g', color = 'bg-orange-400', bgColor = 'bg-orange-50', textColor = 'text-orange-600' }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const over = current > target

  return (
    <div className={`${bgColor} rounded-2xl p-3.5`}>
      <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold leading-none ${over ? 'text-red-500' : textColor}`}>
        {current}
      </p>
      <p className="text-xs text-zinc-400 mt-1 mb-2.5">/ {target} {unit}</p>
      <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-red-400' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
