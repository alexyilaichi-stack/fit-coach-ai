import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient.js'
import { callClaude } from '../lib/claude.js'
import { useAuth } from '../hooks/useAuth.js'
import { useProfile } from '../hooks/useProfile.js'
import { useLanguage } from '../lib/i18n.jsx'
import LogFeedback from '../components/LogFeedback.jsx'
import PhotoConfirm from '../components/PhotoConfirm.jsx'

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

  const todayStr = new Date().toLocaleDateString('en-CA')
  const [logDate, setLogDate] = useState(todayStr)
  const isToday = logDate === todayStr

  function loggedAtForDate(dateStr) {
    if (dateStr === todayStr) return new Date().toISOString()
    return new Date(dateStr + 'T12:00:00').toISOString()
  }

  const photoInputRef = useRef(null)
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
    if (!text.trim()) return
    setError(null); setFeedback(null); setLoading(true); setLoadingLabel(t('quicklog.analyzing'))
    try {
      // Fetch active injuries so Claude can identify which ones are being resolved
      const { data: activeInjuries } = await supabase
        .from('injury_logs').select('id, description').eq('user_id', user.id).eq('is_active', true)
      const result = await callClaude('process_quick_log', {
        mode: 'text',
        raw_input: text.trim(),
        profile: profilePayload,
        active_injuries: (activeInjuries || []).map(i => ({ id: i.id, description: i.description })),
      }, lang)
      const loggedAt = loggedAtForDate(logDate)
      const saves = []
      if (result.food) saves.push(saveFoodLog(result.food, null, loggedAt))
      if (result.injury) saves.push(saveInjuryLog(result.injury, result.resolves || []))
      saves.push(saveQuickLog(text.trim(), result.categories, result.ai_response, null, loggedAt))
      await Promise.all(saves)
      setFeedback({ categories: result.categories, aiResponse: result.ai_response, destRoute: primaryRoute(result.categories), logDate: isToday ? null : logDate })
      setText('')
      setLogDate(todayStr)
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

        <button
          onClick={handleTextSubmit}
          disabled={loading || !text.trim()}
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

      {/* Photo + Apple Health */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => photoInputRef.current?.click()}
          disabled={loading}
          className="flex flex-col items-center gap-2 py-5 rounded-2xl border border-zinc-200 bg-white hover:border-orange-300 hover:bg-orange-50 disabled:opacity-40 transition-all shadow-sm"
        >
          <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
          </svg>
          <span className="text-sm font-medium text-zinc-600">{t('quicklog.food_photo')}</span>
        </button>

        <button
          onClick={() => healthInputRef.current?.click()}
          disabled={loading}
          className="flex flex-col items-center gap-2 py-5 rounded-2xl border border-zinc-200 bg-white hover:border-orange-300 hover:bg-orange-50 disabled:opacity-40 transition-all shadow-sm"
        >
          <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
          <span className="text-sm font-medium text-zinc-600">{t('quicklog.apple_health')}</span>
        </button>
      </div>

      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
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

      {photoConfirm && (
        <PhotoConfirm previewUrl={photoConfirm.previewUrl} foodData={photoConfirm.foodData} onConfirm={confirmPhotoSave} onCancel={cancelPhoto} />
      )}
    </div>
  )
}
