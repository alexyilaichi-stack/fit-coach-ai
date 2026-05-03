import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { supabase } from '../supabaseClient.js'
import { useLanguage } from '../lib/i18n.jsx'

function buildWeeks(logs) {
  const weeks = []
  for (let i = 3; i >= 0; i--) {
    const end = new Date()
    end.setDate(end.getDate() - i * 7)
    end.setHours(23, 59, 59, 999)
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)

    const label = i === 0 ? 'This week' : i === 1 ? 'Last week' : `${i}w ago`
    const count = logs.filter(l => {
      const t = new Date(l.logged_at)
      return t >= start && t <= end
    }).length
    weeks.push({ label, count, isCurrent: i === 0 })
  }
  return weeks
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-zinc-200 rounded-xl px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-zinc-700">{label}</p>
      <p className="text-orange-500 font-semibold">{payload[0].value} workouts</p>
    </div>
  )
}

export default function WorkoutFrequency({ userId }) {
  const [data, setData] = useState([])
  const { t } = useLanguage()

  useEffect(() => {
    if (!userId) return
    const since = new Date()
    since.setDate(since.getDate() - 28)
    since.setHours(0, 0, 0, 0)
    supabase
      .from('quick_logs')
      .select('logged_at, categories')
      .eq('user_id', userId)
      .gte('logged_at', since.toISOString())
      .contains('categories', ['workout'])
      .then(({ data: logs }) => setData(buildWeeks(logs || [])))
  }, [userId])

  const hasData = data.some(d => d.count > 0)
  if (!hasData) return null

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-zinc-700 mb-3">{t('body.workout_frequency')}</h2>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barSize={36}>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f5' }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isCurrent ? '#f97316' : '#fed7aa'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
