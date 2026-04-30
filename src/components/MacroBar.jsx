export default function MacroBar({ label, current = 0, target = 0, unit = 'g', color = 'bg-orange-400' }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const over = current > target

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <span className={`text-xs font-semibold ${over ? 'text-red-500' : 'text-zinc-700'}`}>
          {current}<span className="text-zinc-400 font-normal">/{target}{unit}</span>
        </span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-400' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
