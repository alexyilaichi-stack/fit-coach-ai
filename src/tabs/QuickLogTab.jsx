import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient.js'
import { callClaude } from '../lib/claude.js'
import { useAuth } from '../hooks/useAuth.js'
import { useProfile } from '../hooks/useProfile.js'
import { useLanguage } from '../lib/i18n.jsx'
import LogFeedback from '../components/LogFeedback.jsx'
import PhotoConfirm from '../components/PhotoConfirm.jsx'

const CATEGORY_COLORS = {
  food:         'bg-emerald-100 text-emerald-700',
  injury:       'bg-amber-100 text-amber-700',
  workout:      'bg-blue-100 text-blue-700',
  apple_health: 'bg-violet-100 text-violet-700',
  other:        'bg-zinc-100 text-zinc-500',
}

function timeAgo(isoStr, lang) {
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000)
  if (diff < 60)  return lang === 'zh' ? '刚刚' : 'Just now'
  if (diff < 3600) {
    const m = Math.floor(diff / 60)
    return lang === 'zh' ? `${m}分钟前` : `${m}m ago`
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600)
    return lang === 'zh' ? `${h}小时前` : `${h}h ago`
  }
  const d = Math.floor(diff / 86400)
  if (d === 1) return lang === 'zh' ? '昨天' : 'Yesterday'
  return lang === 'zh' ? `${d}天前` : `${d}d ago`
}

function LogHistoryItem({ log }) {
  const { t, lang } = useLanguage()
  const isPhoto = log.image_url && !log.raw_input?.startsWith('[apple')
  return (
    <div className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(log.categories || []).map(cat => (
            <span key={cat} className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.other}`}>
              {t('feedback.' + cat)}
            </span>
          ))}
        </div>
        <span className="text-xs text-zinc-400 shrink-0">{timeAgo(log.logged_at, lang)}</span>
      </div>
      {isPhoto ? (
        <img src={log.image_url} alt="" className="w-full h-28 object-cover rounded-xl" />
      ) : (
        <p className="text-sm text-zinc-700 leading-relaxed">{log.raw_input}</p>
      )}
      {log.ai_response && (
        <p className="text-sm text-zinc-500 leading-relaxed border-t border-zinc-50 pt-2">{log.ai_response}</p>
      )}
    </div>
  )
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function uploadToStorage(file, userId) {
  const ext = file.name.split('.').pop() || 'jpg'
  const key = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('food-photos').upload(key, file)
  if (error) throw error
  const { data } = supabase.storage.from('food-photos').getPublicUrl(key)
  return { key, url: data.publicUrl }
}

async function deleteFromStorage(key) {
  await supabase.storage.from('food-photos').remove([key])
}

function primaryRoute(categories) {
  if (categories.includes('food')) return '/app/nutrition'
  return '/app/training'
}

const DEFAULTS_ZH = ['鸡胸肉', '米饭', '燕麦', '鸡蛋', '牛奶', '麻辣烫', '沙拉', '蛋白粉']
const DEFAULTS_EN = ['Chicken', 'Rice', 'Oatmeal', 'Eggs', 'Milk', 'Salad', 'Protein shake', 'Banana']

export default function QuickLogTab() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const { t, lang } = useLanguage()

  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('')
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [photoConfirm, setPhotoConfirm] = useState(null)
  const [recentLogs, setRecentLogs] = useState([])
  const [favorites, setFavorites] = useState([])
  const [selectedFoods, setSelectedFoods] = useState([])
  const [showWorkoutLog, setShowWorkoutLog] = useState(false)
  const [workoutInput, setWorkoutInput] = useState('')
  const [workoutParsing, setWorkoutParsing] = useState(false)
  const [workoutError, setWorkoutError] = useState(null)
  const [workoutSuccess, setWorkoutSuccess] = useState(false)

  const loadRecentLogs = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('quick_logs')
      .select('id, raw_input, categories, ai_response, image_url, logged_at')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(20)
    setRecentLogs(data || [])
  }, [user?.id])

  const loadFavorites = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('food_logs')
      .select('description')
      .eq('user_id', user.id)
      .limit(300)
    const counts = {}
    for (const { description } of data || []) {
      if (description) counts[description] = (counts[description] || 0) + 1
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name)
    setFavorites(sorted)
  }, [user?.id])

  useEffect(() => { loadRecentLogs(); loadFavorites() }, [loadRecentLogs, loadFavorites])

  function toggleFavorite(name) {
    setSelectedFoods(prev => {
      if (prev.find(f => f.name === name)) return prev.filter(f => f.name !== name)
      return [...prev, { name, qty: lang === 'zh' ? '一份' : '1 serving' }]
    })
  }

  function updateQty(name, qty) {
    setSelectedFoods(prev => prev.map(f => f.name === name ? { ...f, qty } : f))
  }

  const todayStr = new Date().toLocaleDateString('en-CA')
  const [logDate, setLogDate] = useState(todayStr)
  const isToday = logDate === todayStr

  function loggedAtForDate(dateStr) {
    if (dateStr === todayStr) return new Date().toISOString()
    return new Date(dateStr + 'T12:00:00').toISOString()
  }

  const photoInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const healthInputRef = useRef(null)

  const profilePayload = profile
    ? { goal: profile.goal, weight_kg: profile.weight_kg, daily_calories: profile.daily_calories, daily_protein_g: profile.daily_protein_g, daily_carbs_g: profile.daily_carbs_g, daily_fat_g: profile.daily_fat_g }
    : null

  async function saveQuickLog(rawInput, categories, aiResponse, imageUrl = null, loggedAt = null) {
    await supabase.from('quick_logs').insert({ user_id: user.id, raw_input: rawInput, categories, ai_response: aiResponse, image_url: imageUrl, ...(loggedAt ? { logged_at: loggedAt } : {}) })
  }

  async function saveFoodLog(foodData, imageUrl = null, loggedAt = null) {
    await supabase.from('food_logs').insert({ user_id: user.id, description: foodData.description, calories: foodData.calories, protein_g: foodData.protein_g, carbs_g: foodData.carbs_g, fat_g: foodData.fat_g, image_url: imageUrl, ...(loggedAt ? { logged_at: loggedAt } : {}) })
  }

  async function saveInjuryLog(injuryData, resolvesIds = []) {
    const now = new Date().toISOString()
    const isRecovery = injuryData.is_active === false
    const saves = []
    // Claude told us exactly which active injury records this resolves
    if (resolvesIds.length) {
      saves.push(
        supabase.from('injury_logs')
          .update({ is_active: false, resolved_at: now })
          .in('id', resolvesIds)
      )
    }
    saves.push(
      supabase.from('injury_logs').insert({
        user_id: user.id,
        description: injuryData.description,
        is_active: injuryData.is_active ?? true,
        ...(isRecovery ? { resolved_at: now } : {}),
      })
    )
    await Promise.all(saves)
  }

  async function handleTextSubmit() {
    const foodPart = selectedFoods.map(f => `${f.name} ${f.qty}`).join('、')
    const rawInput = [foodPart, text.trim()].filter(Boolean).join('，另外')
    if (!rawInput) return
    setError(null); setFeedback(null); setLoading(true); setLoadingLabel(t('quicklog.analyzing'))
    try {
      const { data: activeInjuries } = await supabase
        .from('injury_logs').select('id, description').eq('user_id', user.id).eq('is_active', true)
      const result = await callClaude('process_quick_log', {
        mode: 'text',
        raw_input: rawInput,
        profile: profilePayload,
        active_injuries: (activeInjuries || []).map(i => ({ id: i.id, description: i.description })),
      }, lang)
      const loggedAt = loggedAtForDate(logDate)
      const saves = []
      if (result.food) saves.push(saveFoodLog(result.food, null, loggedAt))
      if (result.injury) saves.push(saveInjuryLog(result.injury, result.resolves || []))
      saves.push(saveQuickLog(rawInput, result.categories, result.ai_response, null, loggedAt))
      await Promise.all(saves)
      setFeedback({ categories: result.categories, aiResponse: result.ai_response, destRoute: primaryRoute(result.categories) })
      setText(''); setSelectedFoods([]); setLogDate(todayStr)
      loadRecentLogs(); loadFavorites()
      // Fire-and-forget: save structured sets when workout with weight data detected
      const hasWeightData = /\d+\s*(磅|lbs|kg)/i.test(rawInput) || /\d+[*×]\d+/.test(rawInput)
      if (result.categories.includes('workout') && hasWeightData) {
        callClaude('parse_workout_log', { raw_input: rawInput }, lang)
          .then(async parsed => {
            for (const session of parsed.sessions || []) {
              const { data: existing } = await supabase.from('workout_sessions').select('id').eq('user_id', user.id).eq('workout_date', session.date).maybeSingle()
              let sessionId
              if (existing) { sessionId = existing.id }
              else {
                const { data } = await supabase.from('workout_sessions').insert({ user_id: user.id, workout_date: session.date }).select().single()
                sessionId = data?.id
              }
              if (!sessionId) continue
              const rows = (session.exercises || []).map((ex, i) => ({ session_id: sessionId, user_id: user.id, exercise: ex.exercise, sets_data: ex.sets_data || [], is_warmup: ex.is_warmup || false, set_order: ex.order ?? i }))
              if (rows.length) await supabase.from('workout_sets').insert(rows)
            }
          })
          .catch(() => {})
      }
    } catch { setError(t('quicklog.error_general')) }
    finally { setLoading(false); setLoadingLabel('') }
  }

  async function handlePhotoUpload(file) {
    if (!file) return
    setError(null); setFeedback(null); setLoading(true); setLoadingLabel(t('quicklog.identifying'))
    try {
      const [base64, storage] = await Promise.all([fileToBase64(file), uploadToStorage(file, user.id)])
      const result = await callClaude('process_quick_log', { mode: 'food_photo', image_data: base64, image_media_type: file.type || 'image/jpeg', profile: profilePayload }, lang)
      setPhotoConfirm({ previewUrl: URL.createObjectURL(file), storageKey: storage.key, storageUrl: storage.url, foodData: result.food, aiResponse: result.ai_response, categories: result.categories })
    } catch { setError(t('quicklog.error_food')) }
    finally { setLoading(false); setLoadingLabel('') }
  }

  async function confirmPhotoSave() {
    if (!photoConfirm) return
    setLoading(true); setLoadingLabel(t('quicklog.saving'))
    try {
      await Promise.all([
        saveFoodLog(photoConfirm.foodData, photoConfirm.storageUrl),
        saveQuickLog('[food photo]', photoConfirm.categories || ['food'], photoConfirm.aiResponse, photoConfirm.storageUrl),
      ])
      setFeedback({ categories: photoConfirm.categories || ['food'], aiResponse: photoConfirm.aiResponse, destRoute: '/app/nutrition' })
      setPhotoConfirm(null)
      loadRecentLogs()
    } catch { setError(t('quicklog.error_save')) }
    finally { setLoading(false); setLoadingLabel('') }
  }

  async function cancelPhoto() {
    if (!photoConfirm) return
    await deleteFromStorage(photoConfirm.storageKey).catch(() => {})
    if (photoConfirm.previewUrl) URL.revokeObjectURL(photoConfirm.previewUrl)
    setPhotoConfirm(null)
  }

  async function handleAppleHealthUpload(file) {
    if (!file) return
    setError(null); setFeedback(null); setLoading(true); setLoadingLabel(t('quicklog.reading_health'))
    try {
      const [base64, storage] = await Promise.all([fileToBase64(file), uploadToStorage(file, user.id)])
      const result = await callClaude('process_quick_log', { mode: 'apple_health', image_data: base64, image_media_type: file.type || 'image/jpeg', profile: profilePayload }, lang)
      await saveQuickLog('[apple health screenshot]', result.categories, result.ai_response, storage.url)
      setFeedback({ categories: result.categories, aiResponse: result.ai_response, destRoute: '/app/training' })
    } catch { setError(t('quicklog.error_health')) }
    finally { setLoading(false); setLoadingLabel('') }
  }

  async function handleWorkoutLog() {
    if (!workoutInput.trim()) return
    setWorkoutParsing(true); setWorkoutError(null); setWorkoutSuccess(false)
    try {
      const parsed = await callClaude('parse_workout_log', { raw_input: workoutInput.trim() }, lang)
      for (const session of parsed.sessions || []) {
        const { data: existing } = await supabase.from('workout_sessions').select('id').eq('user_id', user.id).eq('workout_date', session.date).maybeSingle()
        let sessionId
        if (existing) {
          sessionId = existing.id
          await supabase.from('workout_sets').delete().eq('session_id', sessionId)
        } else {
          const { data } = await supabase.from('workout_sessions').insert({ user_id: user.id, workout_date: session.date }).select().single()
          sessionId = data?.id
        }
        if (!sessionId) continue
        const rows = (session.exercises || []).map((ex, i) => ({ session_id: sessionId, user_id: user.id, exercise: ex.exercise, sets_data: ex.sets_data || [], is_warmup: ex.is_warmup || false, set_order: ex.order ?? i }))
        if (rows.length) await supabase.from('workout_sets').insert(rows)
      }
      setWorkoutSuccess(true); setWorkoutInput('')
    } catch { setWorkoutError(t('training.log_error')) }
    finally { setWorkoutParsing(false) }
  }

  return (
    <div className="flex flex-col min-h-full bg-zinc-50 p-4 gap-4 pt-16">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('quicklog.title')}</h1>
        <p className="text-sm text-zinc-400 mt-1">{t('quicklog.subtitle')}</p>
      </div>

      {/* Text input */}
      <div className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('quicklog.placeholder')}
          rows={4}
          disabled={loading}
          className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 placeholder-zinc-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:opacity-50 shadow-sm transition-shadow"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleTextSubmit() }}
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={logDate}
            max={todayStr}
            onChange={e => setLogDate(e.target.value)}
            disabled={loading}
            className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:opacity-50"
          />
          {!isToday && (
            <span className="text-xs text-orange-500 font-medium">
              {t('quicklog.logging_for_past')}
            </span>
          )}
        </div>

        {/* Favorite food chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {(favorites.length > 0 ? favorites : (lang === 'zh' ? DEFAULTS_ZH : DEFAULTS_EN)).map(name => {
            const selected = selectedFoods.some(f => f.name === name)
            return (
              <button
                key={name}
                onClick={() => toggleFavorite(name)}
                disabled={loading}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selected
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-orange-300 hover:text-orange-500'
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>

        {/* Selected food blocks */}
        {selectedFoods.length > 0 && (
          <div className="flex flex-col gap-2">
            {selectedFoods.map(f => (
              <div key={f.name} className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                <span className="text-sm font-medium text-orange-700 flex-1">{f.name}</span>
                <input
                  type="text"
                  value={f.qty}
                  onChange={e => updateQty(f.name, e.target.value)}
                  className="w-24 bg-white border border-orange-200 rounded-lg px-2 py-1 text-xs text-zinc-700 text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  onClick={() => toggleFavorite(f.name)}
                  className="w-5 h-5 flex items-center justify-center text-orange-400 hover:text-orange-600 transition-colors"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleTextSubmit}
          disabled={loading || (!text.trim() && selectedFoods.length === 0)}
          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-semibold text-sm transition-all active:scale-95 shadow-sm shadow-orange-100"
        >
          {loading && loadingLabel ? loadingLabel : t('quicklog.submit')}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-200" />
        <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">{t('quicklog.or_upload')}</span>
        <div className="flex-1 h-px bg-zinc-200" />
      </div>

      {/* Photo + Gallery + Apple Health */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => photoInputRef.current?.click()}
          disabled={loading}
          className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-zinc-200 bg-white hover:border-orange-300 hover:bg-orange-50 disabled:opacity-40 transition-all shadow-sm"
        >
          <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
          </svg>
          <span className="text-xs font-medium text-zinc-600">{t('quicklog.camera')}</span>
        </button>

        <button
          onClick={() => galleryInputRef.current?.click()}
          disabled={loading}
          className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-zinc-200 bg-white hover:border-orange-300 hover:bg-orange-50 disabled:opacity-40 transition-all shadow-sm"
        >
          <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <span className="text-xs font-medium text-zinc-600">{t('quicklog.gallery')}</span>
        </button>

        <button
          onClick={() => healthInputRef.current?.click()}
          disabled={loading}
          className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-zinc-200 bg-white hover:border-orange-300 hover:bg-orange-50 disabled:opacity-40 transition-all shadow-sm"
        >
          <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
          <span className="text-xs font-medium text-zinc-600">{t('quicklog.apple_health')}</span>
        </button>
      </div>

      {/* Workout notes paste section */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <button
          onClick={() => { setShowWorkoutLog(v => !v); setWorkoutSuccess(false); setWorkoutError(null) }}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
            <span className="text-sm font-medium text-zinc-700">{t('quicklog.workout_notes')}</span>
          </div>
          <svg className={`w-4 h-4 text-zinc-400 transition-transform ${showWorkoutLog ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showWorkoutLog && (
          <div className="px-4 pb-4 border-t border-zinc-50 flex flex-col gap-2">
            <textarea
              value={workoutInput}
              onChange={e => setWorkoutInput(e.target.value)}
              placeholder={t('training.log_workout_placeholder')}
              rows={8}
              disabled={workoutParsing}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:opacity-50 font-mono leading-relaxed mt-2"
            />
            {workoutSuccess && <p className="text-xs text-emerald-600 font-medium">{t('training.log_success')}</p>}
            {workoutError && <p className="text-xs text-red-500">{workoutError}</p>}
            <button
              onClick={handleWorkoutLog}
              disabled={workoutParsing || !workoutInput.trim()}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-semibold text-sm transition-all active:scale-95 shadow-sm shadow-orange-100 flex items-center justify-center gap-2"
            >
              {workoutParsing ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />{t('training.parsing')}</>
              ) : t('training.log_workout_btn')}
            </button>
          </div>
        )}
      </div>

      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) handlePhotoUpload(file) }} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) handlePhotoUpload(file) }} />
      <input ref={healthInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) handleAppleHealthUpload(file) }} />

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 py-2">
          <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-500">{loadingLabel}</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => { setError(null); if (text.trim()) handleTextSubmit() }} className="text-sm text-red-500 font-medium ml-3">
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Feedback */}
      {feedback && !loading && (
        <div className="bg-white border border-zinc-100 rounded-2xl px-4 py-4 flex flex-col gap-3 shadow-sm">
          <LogFeedback categories={feedback.categories} aiResponse={feedback.aiResponse} />
          {feedback.destRoute && (
            <button
              onClick={() => navigate(feedback.destRoute)}
              className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 text-sm font-medium transition-colors"
            >
              {feedback.destRoute === '/app/nutrition' ? t('quicklog.go_nutrition') : t('quicklog.go_training')}
            </button>
          )}
        </div>
      )}

      {/* Recent logs feed */}
      {recentLogs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">{t('quicklog.history')}</p>
          {recentLogs.map(log => (
            <LogHistoryItem key={log.id} log={log} />
          ))}
        </div>
      )}

      {photoConfirm && (
        <PhotoConfirm previewUrl={photoConfirm.previewUrl} foodData={photoConfirm.foodData} onConfirm={confirmPhotoSave} onCancel={cancelPhoto} />
      )}
    </div>
  )
}
