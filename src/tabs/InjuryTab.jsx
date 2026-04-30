import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../hooks/useAuth.js'
import { useProfile } from '../hooks/useProfile.js'
import { useLanguage } from '../lib/i18n.jsx'
import InjuryEntry from '../components/InjuryEntry.jsx'

const GOAL_KEYS = { weight_loss: 'body.goal.weight_loss', muscle_gain: 'body.goal.muscle_gain', other: 'body.goal.other' }

function StatRow({ label, value, unit }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-semibold text-zinc-800">{value}{unit ? <span className="text-zinc-400 font-normal ml-0.5">{unit}</span> : ''}</span>
    </div>
  )
}

function EditField({ label, value, onChange, type = 'number', textarea = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none transition-shadow"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-shadow"
        />
      )}
    </div>
  )
}

export default function InjuryTab() {
  const { user } = useAuth()
  const { profile, updateProfile } = useProfile(user?.id)
  const { t } = useLanguage()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [form, setForm] = useState(null)

  const [injuries, setInjuries] = useState([])
  const [injuriesLoading, setInjuriesLoading] = useState(true)

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function openEdit() {
    if (!profile) return
    setForm({
      height_cm:      String(profile.height_cm ?? ''),
      weight_kg:      String(profile.weight_kg ?? ''),
      body_fat_pct:   String(profile.body_fat_pct ?? ''),
      muscle_mass_kg: String(profile.muscle_mass_kg ?? ''),
      bench_kg:       String(profile.bench_kg ?? ''),
      squat_kg:       String(profile.squat_kg ?? ''),
      deadlift_kg:    String(profile.deadlift_kg ?? ''),
      goal:           profile.goal ?? 'muscle_gain',
      target:         profile.target ?? '',
    })
    setSaveError(null)
    setEditing(true)
  }

  async function handleSave() {
    if (!form) return
    setSaving(true); setSaveError(null)
    try {
      const updates = {
        height_cm:      parseFloat(form.height_cm) || null,
        weight_kg:      parseFloat(form.weight_kg) || null,
        body_fat_pct:   parseFloat(form.body_fat_pct) || null,
        muscle_mass_kg: parseFloat(form.muscle_mass_kg) || null,
        bench_kg:       form.bench_kg ? parseFloat(form.bench_kg) : null,
        squat_kg:       form.squat_kg ? parseFloat(form.squat_kg) : null,
        deadlift_kg:    form.deadlift_kg ? parseFloat(form.deadlift_kg) : null,
        goal:           form.goal,
        target:         form.target,
      }
      await updateProfile(updates)
      setEditing(false)
    } catch { setSaveError(t('body.save_error')) }
    finally { setSaving(false) }
  }

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('injury_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .then(({ data }) => { setInjuries(data || []); setInjuriesLoading(false) })
  }, [user?.id])

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-50">
        <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-zinc-50 p-4 gap-4 pt-16 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">{t('body.title')}</h1>
        {!editing && (
          <button
            onClick={openEdit}
            className="px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-xs font-medium text-zinc-500 hover:border-orange-300 hover:text-orange-500 shadow-sm transition-colors"
          >
            {t('body.edit')}
          </button>
        )}
      </div>

      {/* Stats panel */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-1">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{t('body.stats')}</p>
        </div>

        {editing && form ? (
          <div className="px-4 pb-4 flex flex-col gap-3">
            <EditField label={t('body.height')} value={form.height_cm} onChange={v => update('height_cm', v)} />
            <EditField label={t('body.weight')} value={form.weight_kg} onChange={v => update('weight_kg', v)} />
            <EditField label={t('body.body_fat')} value={form.body_fat_pct} onChange={v => update('body_fat_pct', v)} />
            <EditField label={t('body.muscle_mass')} value={form.muscle_mass_kg} onChange={v => update('muscle_mass_kg', v)} />
            <EditField label={t('body.bench')} value={form.bench_kg} onChange={v => update('bench_kg', v)} />
            <EditField label={t('body.squat')} value={form.squat_kg} onChange={v => update('squat_kg', v)} />
            <EditField label={t('body.deadlift')} value={form.deadlift_kg} onChange={v => update('deadlift_kg', v)} />

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">{t('body.goal')}</label>
              <div className="flex gap-2">
                {['weight_loss', 'muscle_gain', 'other'].map(g => (
                  <button
                    key={g}
                    onClick={() => update('goal', g)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                      form.goal === g
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-orange-300'
                    }`}
                  >
                    {t(GOAL_KEYS[g])}
                  </button>
                ))}
              </div>
            </div>

            <EditField label={t('body.target')} value={form.target} onChange={v => update('target', v)} textarea />

            {saveError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {t('body.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold transition-all active:scale-95 shadow-sm shadow-orange-100 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                    {t('body.saving')}
                  </>
                ) : t('body.save')}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4">
            <StatRow label={t('body.height')} value={profile.height_cm} unit=" cm" />
            <StatRow label={t('body.weight')} value={profile.weight_kg} unit=" kg" />
            <StatRow label={t('body.body_fat')} value={profile.body_fat_pct} unit="%" />
            <StatRow label={t('body.muscle_mass')} value={profile.muscle_mass_kg} unit=" kg" />
            {profile.bench_kg && <StatRow label={t('body.bench')} value={profile.bench_kg} unit=" kg" />}
            {profile.squat_kg && <StatRow label={t('body.squat')} value={profile.squat_kg} unit=" kg" />}
            {profile.deadlift_kg && <StatRow label={t('body.deadlift')} value={profile.deadlift_kg} unit=" kg" />}
            {profile.goal && <StatRow label={t('body.goal')} value={t(GOAL_KEYS[profile.goal] || 'body.goal.other')} />}
            {profile.target && (
              <div className="py-2 border-b border-zinc-100 last:border-0">
                <p className="text-sm text-zinc-500 mb-1">{t('body.target')}</p>
                <p className="text-sm text-zinc-800 leading-relaxed">{profile.target}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Macro targets panel */}
      {!editing && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-4 py-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{t('body.macros')}</p>
          <StatRow label={t('body.calories')} value={profile.daily_calories} unit=" kcal" />
          <StatRow label={t('body.protein')} value={profile.daily_protein_g} unit="g" />
          <StatRow label={t('body.carbs')} value={profile.daily_carbs_g} unit="g" />
          <StatRow label={t('body.fat')} value={profile.daily_fat_g} unit="g" />
        </div>
      )}

      {/* Condition history */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('body.conditions')}</p>
        </div>
        {injuriesLoading ? (
          <div className="px-4 pb-4 flex items-center gap-2 text-sm text-zinc-400">
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
            {t('common.loading')}
          </div>
        ) : injuries.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-zinc-400">{t('body.no_conditions')}</p>
        ) : (
          <div className="px-4 pb-2">
            {injuries.map(entry => (
              <InjuryEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
