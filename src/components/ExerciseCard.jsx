import { useState } from 'react'
import { useLanguage } from '../lib/i18n.jsx'

const EXERCISE_ZH = {
  // Chest
  'bench press': '卧推',
  'incline bench press': '上斜卧推',
  'decline bench press': '下斜卧推',
  'incline dumbbell press': '上斜哑铃推',
  'dumbbell press': '哑铃推',
  'dumbbell fly': '哑铃飞鸟',
  'cable fly': '绳索飞鸟',
  'cable crossover': '绳索交叉',
  'chest fly': '胸部飞鸟',
  'pec deck': '夹胸机',
  'push up': '俯卧撑',
  'push-up': '俯卧撑',
  'dips': '双杠臂屈伸',
  // Shoulders
  'shoulder press': '肩推',
  'overhead press': '头顶推',
  'military press': '军事推举',
  'dumbbell shoulder press': '哑铃肩推',
  'lateral raise': '侧平举',
  'front raise': '前平举',
  'face pull': '面拉',
  'arnold press': '阿诺德推',
  'upright row': '直立划船',
  // Back
  'pull up': '引体向上',
  'pull-up': '引体向上',
  'chin up': '反握引体',
  'chin-up': '反握引体',
  'lat pulldown': '高位下拉',
  'barbell row': '杠铃划船',
  'bent over row': '俯身划船',
  'bent-over row': '俯身划船',
  'seated cable row': '坐姿绳索划船',
  'cable row': '绳索划船',
  'dumbbell row': '哑铃划船',
  'single arm dumbbell row': '单臂哑铃划船',
  't-bar row': 'T杠划船',
  'hyperextension': '背部伸展',
  'deadlift': '硬拉',
  'romanian deadlift': '罗马尼亚硬拉',
  'rdl': '罗马尼亚硬拉',
  'rack pull': '半程硬拉',
  'dumbbell shrug': '哑铃耸肩',
  'barbell shrug': '杠铃耸肩',
  // Biceps
  'barbell curl': '杠铃弯举',
  'dumbbell curl': '哑铃弯举',
  'hammer curl': '锤式弯举',
  'cable curl': '绳索弯举',
  'incline dumbbell curl': '上斜哑铃弯举',
  'concentration curl': '集中弯举',
  'preacher curl': '牧师弯举',
  'ez bar curl': 'EZ杠弯举',
  // Triceps
  'tricep pushdown': '绳索下压',
  'tricep push-down': '绳索下压',
  'overhead tricep extension': '过头臂屈伸',
  'skull crusher': '颅骨破碎者',
  'close-grip bench press': '窄距卧推',
  'close grip bench press': '窄距卧推',
  'dip': '臂屈伸',
  'cable overhead extension': '绳索过头伸展',
  'kickback': '后踢腿',
  // Legs
  'squat': '深蹲',
  'barbell squat': '杠铃深蹲',
  'front squat': '前蹲',
  'goblet squat': '酒杯深蹲',
  'leg press': '腿举',
  'leg extension': '腿屈伸',
  'leg curl': '腿弯举',
  'lying leg curl': '俯卧腿弯举',
  'seated leg curl': '坐姿腿弯举',
  'lunge': '弓箭步',
  'walking lunge': '行走弓箭步',
  'bulgarian split squat': '保加利亚分腿蹲',
  'hip thrust': '臀桥推',
  'glute bridge': '臀桥',
  'calf raise': '提踵',
  'standing calf raise': '站姿提踵',
  'seated calf raise': '坐姿提踵',
  'box jump': '跳箱',
  // Core
  'plank': '平板支撑',
  'crunch': '卷腹',
  'sit up': '仰卧起坐',
  'sit-up': '仰卧起坐',
  'leg raise': '悬挂举腿',
  'hanging leg raise': '悬挂举腿',
  'cable crunch': '绳索卷腹',
  'ab wheel': '腹轮',
  // Cardio
  'treadmill': '跑步机',
  'running': '跑步',
  'cycling': '骑行',
  'rowing': '划船机',
  'elliptical': '椭圆机',
  'jump rope': '跳绳',
}

function translateExercise(name, lang) {
  if (lang !== 'zh') return name
  const lower = name.toLowerCase()
  if (EXERCISE_ZH[lower]) return EXERCISE_ZH[lower]
  for (const key of Object.keys(EXERCISE_ZH)) {
    if (lower.includes(key)) return EXERCISE_ZH[key]
  }
  return name
}

function InlineNumber({ value, field, editing, editValue, onEditChange, onStart, onCommit }) {
  if (editing === field) {
    return (
      <input
        type="number"
        value={editValue}
        onChange={(e) => onEditChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onCommit() }
          if (e.key === 'Escape') onCommit()
        }}
        autoFocus
        className="w-14 bg-zinc-100 text-zinc-900 text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-400 text-center border border-zinc-200"
      />
    )
  }
  return (
    <button
      onClick={() => onStart(field)}
      className="min-w-[2rem] px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold transition-colors"
      title="Tap to edit"
    >
      {value}
    </button>
  )
}

export default function ExerciseCard({ exercise, warning, completedSets = [], onSetToggle, onUpdate }) {
  const { lang } = useLanguage()
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')

  const totalSets = exercise.sets || 0
  const doneCount = completedSets.filter(Boolean).length
  const allDone = totalSets > 0 && doneCount === totalSets

  function startEdit(field) {
    setEditing(field)
    setEditValue(String(exercise[field] ?? ''))
  }

  function commitEdit() {
    if (!editing) return
    const field = editing
    setEditing(null)
    const parsed = field === 'weight_kg' ? parseFloat(editValue) : parseInt(editValue, 10)
    if (!isNaN(parsed) && parsed > 0) {
      onUpdate?.({ field, value: parsed })
    }
  }

  const sharedProps = {
    editing,
    editValue,
    onEditChange: setEditValue,
    onStart: startEdit,
    onCommit: commitEdit,
  }

  return (
    <div className={`rounded-2xl px-4 py-3 flex flex-col gap-3 transition-all shadow-sm ${
      allDone
        ? 'bg-emerald-50 border border-emerald-200'
        : 'bg-white border border-zinc-100'
    }`}>

      {warning && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">{warning}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {allDone && (
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
          <span className={`font-semibold text-sm truncate ${allDone ? 'text-emerald-700' : 'text-zinc-900'}`}>
            {translateExercise(exercise.exercise, lang)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <InlineNumber field="sets" value={exercise.sets} {...sharedProps} />
          <span className="text-zinc-300 text-sm">×</span>
          <InlineNumber field="reps" value={exercise.reps} {...sharedProps} />
          <span className="text-zinc-300 text-sm mx-0.5">@</span>
          <InlineNumber field="weight_kg" value={exercise.weight_kg} {...sharedProps} />
          <span className="text-zinc-400 text-xs">kg</span>
        </div>
      </div>

      {totalSets > 0 && (
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSets }, (_, i) => (
            <button
              key={i}
              onClick={() => onSetToggle?.(i)}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all active:scale-95 ${
                completedSets[i]
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-100'
                  : 'bg-zinc-100 text-zinc-500 hover:border hover:border-orange-300 hover:text-orange-500'
              }`}
            >
              {completedSets[i]
                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                : i + 1}
            </button>
          ))}
          <span className="text-xs text-zinc-400 ml-1">{doneCount}/{totalSets}</span>
        </div>
      )}
    </div>
  )
}
