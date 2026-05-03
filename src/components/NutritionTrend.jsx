import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase } from '../supabaseClient.js'
import { useLanguage } from '../lib/i18n.jsx'

function buildDays(logs, calorieTarget, proteinTarget) {
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const key = d.toLocaleDateString('en-CA')
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const dayLogs = logs.filter(l => new Date(l.logged_at).toLocaleDateString('en-CA') === key)
    const calories = Math.round(dayLogs.reduce((s, l) => s + (l.calories || 0), 0))
    const protein = Math.round(dayLogs.reduce((s, l) => s + (l.protein_g || 0), 0))
    if (calories > 0 || i === 0) {
      days.push({ label, calories, protein, calorieTarget, proteinTarget })
    }
  }
  return days
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-zinc-200 rounded-xl px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-zinc-700 mb-1">{label}</p>
      <p style={{ color: d.fill }}>{d.name}: <span className="font-semibold">{d.value}</span></p>
      <p className="text-zinc-400">Target: {payload[0]?.payload?.calorieTarget ?? payload[0]?.payload?.proteinTarget}</p>
    </div>
  )
}

export default function NutritionTrend({ userId, calorieTarget, proteinTarget }) {
  const [data, setData] = useState([])
  const [tab, setTab] = useState('calories')
  const { t } = useLanguage()

  useEffect(() => {
    if (!userId) return
    const since = new Date()
    since.setDate(since.getDate() - 14)
    since.setHours(0, 0, 0, 0)
    supabase
      .from('food_logs')
      .select('logged_at, calories, protein_g')
      .eq('user_id', userId)
      .gte('logged_at', since.toISOString())
      .then(({ data: logs }) => setData(buildDays(logs || [], calorieTarget, proteinTarget)))
  }, [userId, calorieTarget, proteinTarget])

  if (data.length === 0) return null

  const isCalories = tab === 'calories'
  const dataKey = isCalories ? 'calories' : 'protein'
  const target = isCalories ? calorieTarget : proteinTarget
  const color = isCalories ? '#f97316' : '#60a5fa'

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-700">{t('nutrition.trend_title')}</h2>
        <div className="flex gap-1 bg-zinc-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab('calories')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${tab === 'calories' ? 'bg-white text-orange-500 shadow-sm' : 'text-zinc-500'}`}
          >
            {t('nutrition.calories')}
          </button>
          <button
            onClick={() => setTab('protein')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${tab === 'protein' ? 'bg-white text-blue-500 shadow-sm' : 'text-zinc-500'}`}
          >
            {t('nutrition.protein')}
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barSize={14}>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f5' }} />
          <ReferenceLine y={target} stroke={color} strokeDasharray="4 3" strokeOpacity={0.5} />
          <Bar dataKey={dataKey} name={isCalories ? 'kcal' : 'g'} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-zinc-400 mt-1 text-right">
        --- {t('nutrition.trend_target')} ({target}{isCalories ? ' kcal' : 'g'})
      </p>
    </div>
  )
}
