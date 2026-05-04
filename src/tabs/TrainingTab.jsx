import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient.js'
import { callClaude } from '../lib/claude.js'
import { useAuth } from '../hooks/useAuth.js'
import { useProfile } from '../hooks/useProfile.js'
import { useLanguage } from '../lib/i18n.jsx'
import ExerciseCard from '../components/ExerciseCard.jsx'

const WORKOUT_TYPES = [
  { key: 'push' },
  { key: 'pull' },
  { key: 'legs' },
  { key: 'arms' },
  { key: 'full_body' },
]

const READINESS = [
  { key: 'low',    mult: 0.9  },
  { key: 'normal', mult: 1.0  },
  { key: 'high',   mult: 1.05 },
]

const MUSCLE_ZH = {
  'Chest': '胸肌', 'Back': '背部', 'Shoulders': '肩部',
  'Triceps': '三头肌', 'Biceps': '二头肌',
  'Quads': '股四头肌', 'Hamstrings': '腿后肌', 'Glutes': '臀肌', 'Calves': '小腿',
  'Rear Delts': '后三角肌', 'Traps': '斜方肌', 'Abs': '腹肌', 'Core': '核心',
  'Other': '其他',
}

const DAY_DEFAULTS = { 0: 'full_body', 1: 'push', 2: 'pull', 3: 'legs', 4: 'push', 5: 'pull', 6: 'legs' }
function defaultType() { return DAY_DEFAULTS[new Date().getDay()] }
function todayStr() { return new Date().toISOString().slice(0, 10) }

function adjustWeight(weight, readiness) {
  const r = READINESS.find(r => r.key === readiness)
  if (!r || r.mult === 1.0) return weight
  return Math.round(weight * r.mult / 2.5) * 2.5
}

function normalizePlan(raw) {
  if (!raw) return null
  if (Array.isArray(raw)) return { workout_type: null, workout_focus: null, exercises: raw }
  if (raw.exercises) return raw
  return null
}

function groupByMuscle(exercises) {
  const map = new Map()
  for (const ex of exercises) {
    const group = ex.muscle_group || 'Other'
    if (!map.has(group)) map.set(group, [])
    map.get(group).push({ ...ex, _originalIndex: exercises.indexOf(ex) })
  }
  return [...map.entries()]
}

const BODY_PART_MAP = {
  shoulder: ['press', 'fly', 'lateral raise', 'overhead', 'upright row', 'dip'],
  knee:     ['squat', 'lunge', 'leg press', 'step up', 'leg extension', 'jump'],
  back:     ['deadlift', 'row', 'good morning', 'hyperextension'],
  elbow:    ['curl', 'tricep', 'pushdown'],
  wrist:    ['curl', 'wrist'],
  hip:      ['hip thrust', 'hip hinge'],
}

function getInjuryWarning(name, injuries) {
  const n = name.toLowerCase()
  for (const inj of injuries) {
    const d = inj.description.toLowerCase()
    for (const [part, movements] of Object.entries(BODY_PART_MAP)) {
      if (d.includes(part) && movements.some(m => n.includes(m))) {
        return `${inj.description} — consider substituting`
      }
    }
  }
  return null
}

function setsKey(userId, planDbId) { return `fc_sets_${userId}_${planDbId}` }
function loadSetsFromStorage(userId, planDbId) {
  try { return JSON.parse(sessionStorage.getItem(setsKey(userId, planDbId)) || '{}') } catch { return {} }
}
function saveSetsToStorage(userId, planDbId, sets) {
  try { sessionStorage.setItem(setsKey(userId, planDbId), JSON.stringify(sets)) } catch {}
}

// Plan cache — sessionStorage, keyed to user+date so it clears automatically next day
function planCacheKey(userId) { return `fc_plan_${userId}_${todayStr()}` }
function loadPlanCache(userId) {
  try { return JSON.parse(sessionStorage.getItem(planCacheKey(userId)) || 'null') } catch { return null }
}
function savePlanCache(userId, data) {
  try { sessionStorage.setItem(planCacheKey(userId), JSON.stringify(data)) } catch {}
}

// Frequency note cache — localStorage, 12-hour TTL
const FREQ_TTL_MS = 12 * 60 * 60 * 1000
function freqCacheKey(userId) { return `fc_freq_${userId}` }
function loadFreqCache(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(freqCacheKey(userId)) || 'null')
    if (!raw || Date.now() - raw.ts > FREQ_TTL_MS) return null
    return raw.note
  } catch { return null }
}
function saveFreqCache(userId, note) {
  try { localStorage.setItem(freqCacheKey(userId), JSON.stringify({ note, ts: Date.now() })) } catch {}
}

function HistoryEntry({ plan }) {
  const [open, setOpen] = useState(false)
  const { lang } = useLanguage()
  const normalized = normalizePlan(plan.plan_json)
  const exercises = normalized?.exercises || []
  const focus = normalized?.workout_focus || normalized?.workout_type || 'Workout'
  const date = new Date(plan.plan_date + 'T00:00:00')
  const label = date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-zinc-50 transition-colors"
      >
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold text-zinc-900">{label}</span>
          <span className="text-xs text-zinc-400 mt-0.5">{focus}</span>
        </div>
        <svg className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && exercises.length > 0 && (
        <div className="px-4 pb-3 pt-2 bg-zinc-50 flex flex-col gap-1">
          {exercises.map((ex, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-zinc-500 py-1.5 border-b border-zinc-100 last:border-0">
              <span className="text-zinc-700 font-medium">{ex.exercise}</span>
              <span>{ex.sets}×{ex.reps} @ {ex.weight_kg}kg</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TrainingTab() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const { t, lang } = useLanguage()

  const [planData, setPlanData] = useState(null)
  const [planDbId, setPlanDbId] = useState(null)
  const [selectedType, setSelectedType] = useState(defaultType())
  const [readiness, setReadiness] = useState(null)
  const [completedSets, setCompletedSets] = useState({})
  const [frequencyNote, setFrequencyNote] = useState(null)
  const [activeInjuries, setActiveInjuries] = useState([])
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [generatingType, setGeneratingType] = useState(null)
  const [loadingNote, setLoadingNote] = useState(false)
  const [isFallback, setIsFallback] = useState(false)
  const [swapInput, setSwapInput] = useState('')
  const [swapLoading, setSwapLoading] = useState(false)
  const [swapError, setSwapError] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (!user?.id || !planDbId) return
    setCompletedSets(loadSetsFromStorage(user.id, planDbId))
  }, [user?.id, planDbId])

  // Regenerate plan for a specific type (user-triggered tab switch)
  async function generateAndSavePlan(userId, prof, workoutType, existingDbId) {
    const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const [{ data: injuries }, { data: workoutLogs }] = await Promise.all([
      supabase.from('injury_logs').select('description').eq('user_id', userId).eq('is_active', true),
      supabase.from('quick_logs').select('raw_input, logged_at').eq('user_id', userId).contains('categories', ['workout']).gte('logged_at', twoWeeksAgo.toISOString()),
    ])
    setActiveInjuries(injuries || [])
    const result = await callClaude('generate_training_plan', { profile: prof, injuries: injuries || [], recent_workouts: workoutLogs || [], workout_type: workoutType }, lang)
    const newPlanData = { workout_type: result.workout_type || workoutType, workout_focus: result.workout_focus || null, exercises: result.exercises || [] }
    let newId
    if (existingDbId) {
      await supabase.from('training_plans').update({ plan_json: newPlanData, frequency_note: result.frequency_note || null }).eq('id', existingDbId)
      newId = existingDbId
    } else {
      const { data: inserted } = await supabase.from('training_plans').insert({ user_id: userId, plan_date: todayStr(), plan_json: newPlanData, frequency_note: result.frequency_note || null, is_active: true }).select().single()
      newId = inserted?.id
    }
    savePlanCache(userId, { planData: newPlanData, planDbId: newId })
    return { planData: newPlanData, planDbId: newId }
  }

  // Single parallel init: fetch injuries, workout logs, today's plan all at once
  async function initialize(userId, prof) {
    setLoadingPlan(true); setIsFallback(false)

    // Check session cache first — instant render on tab re-visits
    const cached = loadPlanCache(userId)
    if (cached) {
      setPlanData(cached.planData); setPlanDbId(cached.planDbId)
      setSelectedType(cached.planData.workout_type || defaultType())
      setLoadingPlan(false)
      // Always re-fetch injuries so new logs show warnings immediately
      supabase.from('injury_logs').select('description, is_active').eq('user_id', userId).eq('is_active', true)
        .then(({ data }) => setActiveInjuries(data || []))
      const cachedNote = loadFreqCache(userId)
      if (cachedNote) { setFrequencyNote(cachedNote); return }
      fetchFrequencyNote(userId)
      return
    }

    try {
      const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      const [{ data: injuries }, { data: workoutLogs }, { data: existing }] = await Promise.all([
        supabase.from('injury_logs').select('description, is_active').eq('user_id', userId).eq('is_active', true),
        supabase.from('quick_logs').select('raw_input, logged_at').eq('user_id', userId).contains('categories', ['workout']).gte('logged_at', twoWeeksAgo.toISOString()),
        supabase.from('training_plans').select('*').eq('user_id', userId).eq('plan_date', todayStr()).single(),
      ])

      setActiveInjuries(injuries || [])

      if (existing) {
        const normalized = normalizePlan(existing.plan_json)
        if (normalized) {
          setPlanData(normalized); setPlanDbId(existing.id)
          setSelectedType(normalized.workout_type || defaultType())
          savePlanCache(userId, { planData: normalized, planDbId: existing.id })
          setLoadingPlan(false)
          // Frequency note: use cache or call Claude in background (non-blocking)
          const cachedNote = loadFreqCache(userId)
          if (cachedNote) { setFrequencyNote(cachedNote) }
          else { fetchFrequencyNoteWithLogs(userId, workoutLogs || []) }
          return
        }
      }

      // No plan yet — generate one using already-fetched data
      const result = await callClaude('generate_training_plan', { profile: prof, injuries: injuries || [], recent_workouts: workoutLogs || [], workout_type: defaultType() }, lang)
      const newPlanData = { workout_type: result.workout_type || defaultType(), workout_focus: result.workout_focus || null, exercises: result.exercises || [] }
      let newId
      if (existing) {
        await supabase.from('training_plans').update({ plan_json: newPlanData, frequency_note: result.frequency_note || null }).eq('id', existing.id)
        newId = existing.id
      } else {
        const { data: inserted } = await supabase.from('training_plans').insert({ user_id: userId, plan_date: todayStr(), plan_json: newPlanData, frequency_note: result.frequency_note || null, is_active: true }).select().single()
        newId = inserted?.id
      }
      setPlanData(newPlanData); setPlanDbId(newId); setSelectedType(newPlanData.workout_type)
      savePlanCache(userId, { planData: newPlanData, planDbId: newId })
      // Frequency note in background
      const cachedNote = loadFreqCache(userId)
      if (cachedNote) { setFrequencyNote(cachedNote) }
      else { fetchFrequencyNoteWithLogs(userId, workoutLogs || []) }
    } catch {
      setIsFallback(true)
      try {
        const { data: recent } = await supabase.from('training_plans').select('*').eq('user_id', userId).order('plan_date', { ascending: false }).limit(1).single()
        if (recent) { const normalized = normalizePlan(recent.plan_json); if (normalized) { setPlanData(normalized); setSelectedType(normalized.workout_type || defaultType()); setPlanDbId(recent.id) } }
      } catch {}
    } finally { setLoadingPlan(false) }
  }

  async function fetchFrequencyNote(userId) {
    setLoadingNote(true)
    try {
      const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      const [{ data: logs }, { data: sessions }] = await Promise.all([
        supabase.from('quick_logs').select('raw_input, logged_at').eq('user_id', userId).contains('categories', ['workout']).gte('logged_at', twoWeeksAgo.toISOString()),
        supabase.from('workout_sessions').select('workout_date, workout_sets(exercise, is_warmup)').eq('user_id', userId).order('workout_date', { ascending: false }).limit(30),
      ])
      const workoutSessions = (sessions || []).map(s => ({
        date: s.workout_date,
        exercises: (s.workout_sets || []).filter(w => !w.is_warmup).map(w => w.exercise).join(', '),
      }))
      const result = await callClaude('analyze_frequency', { workout_logs: logs || [], workout_sessions: workoutSessions }, lang)
      setFrequencyNote(result.note)
      saveFreqCache(userId, result.note)
    } catch {} finally { setLoadingNote(false) }
  }

  async function fetchFrequencyNoteWithLogs(userId, logs) {
    fetchFrequencyNote(userId)
  }

  async function loadPlan(userId, prof, requestedType = null) {
    if (!requestedType) { initialize(userId, prof); return }
    setGeneratingType(requestedType); setSelectedType(requestedType); setReadiness(null); setCompletedSets({})
    try {
      const { planData: newPlanData, planDbId: newId } = await generateAndSavePlan(userId, prof, requestedType, planDbId)
      setPlanData(newPlanData); setPlanDbId(newId); setSelectedType(newPlanData.workout_type)
    } catch { setIsFallback(true) }
    finally { setGeneratingType(null) }
  }

  async function loadHistory(userId) {
    setLoadingHistory(true)
    try {
      const { data } = await supabase
        .from('training_plans')
        .select('id, plan_date, plan_json, frequency_note')
        .eq('user_id', userId)
        .order('plan_date', { ascending: false })
        .limit(30)
      setHistory((data || []).filter(p => p.plan_date !== todayStr()))
    } catch {}
    finally { setLoadingHistory(false) }
  }


  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user?.id || !profile?.user_id) return
    initialize(user.id, profile)
  }, [user?.id, profile?.user_id])

  async function handleTypeSelect(type) {
    if (type === selectedType || generatingType) return
    setReadiness(null); setCompletedSets({})
    loadPlan(user.id, profile, type)
  }

  async function handleExerciseUpdate(index, { field, value }) {
    if (!planData || !planDbId) return
    if (field === 'weight_kg') setReadiness(null)
    const newExercises = planData.exercises.map((ex, i) => i === index ? { ...ex, [field]: value } : ex)
    const newPlanData = { ...planData, exercises: newExercises }
    setPlanData(newPlanData)
    savePlanCache(user.id, { planData: newPlanData, planDbId })
    await supabase.from('training_plans').update({ plan_json: newPlanData }).eq('id', planDbId)
  }

  function handleSetToggle(exerciseIndex, setIdx) {
    setCompletedSets(prev => {
      const current = [...(prev[exerciseIndex] || Array(planData?.exercises[exerciseIndex]?.sets || 0).fill(false))]
      current[setIdx] = !current[setIdx]
      const next = { ...prev, [exerciseIndex]: current }
      if (user?.id && planDbId) saveSetsToStorage(user.id, planDbId, next)
      return next
    })
  }

  async function handleSwap() {
    if (!swapInput.trim() || !planData) return
    setSwapLoading(true); setSwapError(null)
    try {
      const result = await callClaude('swap_exercise', { current_plan: planData.exercises, request: swapInput.trim(), profile }, lang)
      const newExercises = result.exercises || result.plan || []
      const newPlanData = { ...planData, exercises: newExercises }
      setPlanData(newPlanData); setSwapInput(''); setCompletedSets({})
      savePlanCache(user.id, { planData: newPlanData, planDbId })
      await supabase.from('training_plans').update({ plan_json: newPlanData }).eq('id', planDbId)
    } catch { setSwapError(t('training.swap_error')) }
    finally { setSwapLoading(false) }
  }

  function handleToggleHistory() {
    if (!showHistory && history.length === 0 && user?.id) loadHistory(user.id)
    setShowHistory(h => !h)
  }

  if (loadingPlan || !user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-zinc-50">
        <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-400">{t('training.generating')}</p>
      </div>
    )
  }

  if (!planData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-zinc-50 p-6 text-center">
        <p className="text-zinc-500">{t('training.no_plan')}</p>
        <button onClick={() => loadPlan(user.id, profile)} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium active:scale-95 transition-all">
          {t('common.try_again')}
        </button>
      </div>
    )
  }

  const groups = groupByMuscle(planData.exercises)

  return (
    <div className="flex flex-col min-h-full bg-zinc-50 overflow-y-auto">
      <div className="p-4 flex flex-col gap-5 pb-8 pt-16">

        {/* History button — fixed top-right to align with language toggle */}
        <button
          onClick={handleToggleHistory}
          className={`fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border shadow-sm ${
            showHistory ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
          }`}
        >
          {t('training.history_btn')}
        </button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('training.title')}</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {new Date().toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Workout type pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {WORKOUT_TYPES.map(({ key }) => {
            const isActive = selectedType === key
            const isGenerating = generatingType === key
            return (
              <button
                key={key}
                onClick={() => handleTypeSelect(key)}
                disabled={!!generatingType}
                className={`flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-60 ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-100'
                    : 'bg-white border border-zinc-200 text-zinc-500 hover:border-orange-300 hover:text-zinc-900'
                }`}
              >
                {isGenerating && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                {t('workout.' + key)}
              </button>
            )
          })}
        </div>

        {planData.workout_focus && (
          <p className="text-xs text-orange-500 font-semibold -mt-2">
            {lang === 'zh'
              ? planData.workout_focus.replace(/Chest|Back|Shoulders|Triceps|Biceps|Quads|Hamstrings|Glutes|Calves|Rear Delts|Traps|Abs|Core/g, m => MUSCLE_ZH[m] || m)
              : planData.workout_focus}
          </p>
        )}

        {/* Readiness — segmented control style */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{t('training.energy')}</p>
          <div className="flex bg-zinc-100 rounded-xl p-1 gap-1">
            {READINESS.map(({ key }) => (
              <button
                key={key}
                onClick={() => setReadiness(r => r === key ? null : key)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  readiness === key
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {t('readiness.' + key)}
              </button>
            ))}
          </div>
          {readiness && readiness !== 'normal' && (
            <p className="text-xs text-zinc-400">{t('readiness.' + readiness + '.note')}</p>
          )}
        </div>

        {/* Fallback banner */}
        {isFallback && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-sm text-amber-700">{t('training.fallback')}</p>
            <button onClick={() => loadPlan(user.id, profile)} className="text-sm text-amber-600 font-semibold ml-3">{t('common.retry')}</button>
          </div>
        )}

        {/* Coach note */}
        {loadingNote ? (
          <div className="flex items-center gap-2 bg-white border border-zinc-100 rounded-xl px-4 py-3 shadow-sm">
            <div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-xs text-zinc-400">{t('training.analyzing')}</span>
          </div>
        ) : frequencyNote ? (
          <div className="bg-white border-l-4 border-l-orange-400 border border-zinc-100 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-xs text-orange-500 font-semibold uppercase tracking-wider mb-1">{t('training.coach_note')}</p>
            <p className="text-sm text-zinc-600 leading-relaxed">{frequencyNote}</p>
          </div>
        ) : null}

        {/* Exercises grouped by muscle */}
        {groups.map(([muscleGroup, exercises]) => (
          <div key={muscleGroup} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-orange-400" />
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {lang === 'zh' ? (MUSCLE_ZH[muscleGroup] || muscleGroup) : muscleGroup}
              </p>
            </div>
            {exercises.map((exercise) => (
              <ExerciseCard
                key={exercise._originalIndex}
                exercise={{ ...exercise, weight_kg: adjustWeight(exercise.weight_kg, readiness) }}
                warning={getInjuryWarning(exercise.exercise, activeInjuries)}
                completedSets={completedSets[exercise._originalIndex] || []}
                onSetToggle={(setIdx) => handleSetToggle(exercise._originalIndex, setIdx)}
                onUpdate={(change) => handleExerciseUpdate(exercise._originalIndex, change)}
              />
            ))}
          </div>
        ))}

        {/* AI swap */}
        <div className="flex flex-col gap-2 mt-1">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{t('training.swap_label')}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={swapInput}
              onChange={(e) => setSwapInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSwap() }}
              placeholder={t('training.swap_placeholder')}
              disabled={swapLoading}
              className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:opacity-50 shadow-sm"
            />
            <button
              onClick={handleSwap}
              disabled={swapLoading || !swapInput.trim()}
              className="px-4 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all active:scale-95"
            >
              {swapLoading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : t('training.swap_btn')}
            </button>
          </div>
          {swapError && <p className="text-sm text-red-500">{swapError}</p>}
        </div>

        {/* Workout history */}
        {showHistory && (
          <div className="flex flex-col gap-3 mt-1">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('training.history_title')}</p>
            {loadingHistory ? (
              <div className="flex items-center gap-2 py-3">
                <div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-zinc-400">{t('training.history_loading')}</span>
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-zinc-400">{t('training.history_empty')}</p>
            ) : (
              history.map(plan => <HistoryEntry key={plan.id} plan={plan} />)
            )}
          </div>
        )}

      </div>
    </div>
  )
}
