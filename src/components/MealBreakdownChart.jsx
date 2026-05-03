import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { useLanguage } from '../lib/i18n.jsx'

function getMealSlot(loggedAt) {
  const h = new Date(loggedAt).getHours()
  if (h < 10) return 0       // 早餐
  if (h < 12) return 1       // 加餐
  if (h < 15) return 2       // 午餐
  if (h < 18) return 3       // 下午茶
  if (h < 21) return 4       // 晚餐
  return 5                   // 夜宵
}

const MEAL_LABELS_ZH = ['早餐', '加餐', '午餐', '下午', '晚餐', '夜宵']
const MEAL_LABELS_EN = ['Brkfst', 'Snack', 'Lunch', 'PM', 'Dinner', 'Late']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-zinc-200 rounded-xl px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-zinc-700">{label}</p>
      <p className="text-orange-500 font-semibold">{payload[0].value} kcal</p>
    </div>
  )
}

export default function MealBreakdownChart({ foodLogs = [] }) {
  const { lang } = useLanguage()
  if (foodLogs.length === 0) return null

  const labels = lang === 'zh' ? MEAL_LABELS_ZH : MEAL_LABELS_EN
  const slots = Array(6).fill(0)
  for (const log of foodLogs) slots[getMealSlot(log.logged_at)] += log.calories || 0

  const data = labels.map((label, i) => ({ label, calories: Math.round(slots[i]) })).filter(d => d.calories > 0)
  if (data.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
      <p className="text-sm font-semibold text-zinc-700 mb-3">
        {lang === 'zh' ? '各餐热量' : 'Calories by Meal'}
      </p>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barSize={32}>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#fef3f2' }} />
          <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? '#f97316' : '#fed7aa'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
