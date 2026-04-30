import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient.js'
import { callClaude } from '../lib/claude.js'
import { calculateTDEE } from '../lib/tdee.js'

const STEPS = ['Body Stats', 'Lifting', 'Goal', 'Target', 'Condition']

function Field({ label, value, onChange, placeholder, required = true }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">
        {label}
        {required && <span className="text-orange-500 ml-1">*</span>}
      </label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-shadow text-sm"
      />
    </div>
  )
}

function StepOne({ form, update, onNext }) {
  const valid = form.height_cm && form.weight_kg && form.body_fat_pct && form.muscle_mass_kg
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-zinc-900 font-semibold text-lg">Body Stats</h2>
        <p className="text-zinc-400 text-sm mt-1">Your baseline measurements for accurate calorie and macro targets.</p>
      </div>
      <Field label="Height (cm)" value={form.height_cm} onChange={v => update('height_cm', v)} placeholder="175" />
      <Field label="Weight (kg)" value={form.weight_kg} onChange={v => update('weight_kg', v)} placeholder="75" />
      <Field label="Body Fat %" value={form.body_fat_pct} onChange={v => update('body_fat_pct', v)} placeholder="18" />
      <Field label="Muscle Mass (kg)" value={form.muscle_mass_kg} onChange={v => update('muscle_mass_kg', v)} placeholder="35" />
      <button
        onClick={onNext}
        disabled={!valid}
        className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl py-3 text-sm transition-colors active:scale-95 shadow-sm shadow-orange-100"
      >
        Next
      </button>
    </div>
  )
}

function StepTwo({ form, update, onNext, onBack }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-zinc-900 font-semibold text-lg">Lifting Weights</h2>
        <p className="text-zinc-400 text-sm mt-1">Your current 1-rep max or working weight. All optional — skip if you don't track these.</p>
      </div>
      <Field label="Bench Press (kg)" value={form.bench_kg} onChange={v => update('bench_kg', v)} placeholder="60" required={false} />
      <Field label="Squat (kg)" value={form.squat_kg} onChange={v => update('squat_kg', v)} placeholder="80" required={false} />
      <Field label="Deadlift (kg)" value={form.deadlift_kg} onChange={v => update('deadlift_kg', v)} placeholder="100" required={false} />
      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl py-3 text-sm transition-colors">Back</button>
        <button onClick={onNext} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-xl py-3 text-sm transition-colors shadow-sm shadow-orange-100">Next</button>
      </div>
    </div>
  )
}

function StepThree({ form, update, onNext, onBack }) {
  const goals = [
    { value: 'weight_loss', label: 'Lose weight' },
    { value: 'muscle_gain', label: 'Build muscle' },
    { value: 'other', label: 'Other' },
  ]
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-zinc-900 font-semibold text-lg">Your Goal</h2>
        <p className="text-zinc-400 text-sm mt-1">What are you training for?</p>
      </div>
      <div className="space-y-2">
        {goals.map(g => (
          <label
            key={g.value}
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              form.goal === g.value
                ? 'border-orange-400 bg-orange-50 shadow-sm'
                : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'}`}
          >
            <input
              type="radio"
              name="goal"
              value={g.value}
              checked={form.goal === g.value}
              onChange={() => update('goal', g.value)}
              className="accent-orange-500"
            />
            <span className={`text-sm font-medium ${form.goal === g.value ? 'text-orange-700' : 'text-zinc-700'}`}>{g.label}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl py-3 text-sm transition-colors">Back</button>
        <button onClick={onNext} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-xl py-3 text-sm transition-colors shadow-sm shadow-orange-100">Next</button>
      </div>
    </div>
  )
}

function StepFour({ form, update, onNext, onBack }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-zinc-900 font-semibold text-lg">Your Target</h2>
        <p className="text-zinc-400 text-sm mt-1">What do you want to achieve? Be specific — this goes directly to your AI coach.</p>
      </div>
      <textarea
        value={form.target}
        onChange={e => update('target', e.target.value)}
        placeholder="e.g. bench 100kg by June, lose 5kg before summer, run a 5k under 25 minutes..."
        rows={4}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-shadow resize-none text-sm"
      />
      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl py-3 text-sm transition-colors">Back</button>
        <button
          onClick={onNext}
          disabled={!form.target.trim()}
          className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl py-3 text-sm transition-colors shadow-sm shadow-orange-100"
        >
          Next
        </button>
      </div>
    </div>
  )
}

function StepFive({ form, update, onBack, onSubmit, submitting, error }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-zinc-900 font-semibold text-lg">Current Condition</h2>
        <p className="text-zinc-400 text-sm mt-1">Any injuries, soreness, or notes about how you're feeling right now?</p>
      </div>
      <textarea
        value={form.current_condition}
        onChange={e => update('current_condition', e.target.value)}
        placeholder="e.g. mild shoulder tightness on overhead press, feeling fresh, recovering from a cold... or just 'feeling good, no issues'"
        rows={4}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-shadow resize-none text-sm"
      />
      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
      )}
      {submitting && (
        <div className="flex items-center gap-2.5 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating your plan with Claude...
        </div>
      )}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 text-zinc-700 font-medium rounded-xl py-3 text-sm transition-colors"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl py-3 text-sm transition-colors shadow-sm shadow-orange-100"
        >
          {submitting ? 'Building your plan...' : 'Get My Plan'}
        </button>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    height_cm: '', weight_kg: '', body_fat_pct: '', muscle_mass_kg: '',
    bench_kg: '', squat_kg: '', deadlift_kg: '',
    goal: 'muscle_gain', target: '', current_condition: '',
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user_id = session.user.id

      const numericForm = {
        height_cm: parseFloat(form.height_cm),
        weight_kg: parseFloat(form.weight_kg),
        body_fat_pct: parseFloat(form.body_fat_pct),
        muscle_mass_kg: parseFloat(form.muscle_mass_kg),
        bench_kg: form.bench_kg ? parseFloat(form.bench_kg) : null,
        squat_kg: form.squat_kg ? parseFloat(form.squat_kg) : null,
        deadlift_kg: form.deadlift_kg ? parseFloat(form.deadlift_kg) : null,
        goal: form.goal,
        target: form.target,
        current_condition: form.current_condition || 'Feeling good, no issues',
      }

      const tdee = calculateTDEE({ weight_kg: numericForm.weight_kg, height_cm: numericForm.height_cm, goal: numericForm.goal })
      const aiResult = await callClaude('generate_onboarding_plan', { ...numericForm, ...tdee })
      const today = new Date().toISOString().split('T')[0]

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({ user_id, ...numericForm, ...tdee, onboarding_complete: true }, { onConflict: 'user_id' })
      if (profileError) throw profileError

      const { error: planError } = await supabase
        .from('training_plans')
        .upsert(
          { user_id, plan_date: today, plan_json: aiResult.plan, frequency_note: aiResult.assessment, is_active: true },
          { onConflict: 'user_id,plan_date' }
        )
      if (planError) throw planError

      navigate('/app/training')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500 mb-3 shadow-sm shadow-orange-200">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h1 className="text-zinc-900 text-xl font-bold">FitCoach AI</h1>
          <p className="text-zinc-400 text-sm mt-1">Let's build your profile</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((label, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  i < step
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-100'
                    : i === step
                    ? 'bg-orange-500 text-white ring-2 ring-orange-300 ring-offset-2 ring-offset-zinc-50'
                    : 'bg-zinc-200 text-zinc-400'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? 'text-orange-500 font-medium' : 'text-zinc-400'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="relative h-1.5 bg-zinc-200 rounded-full">
            <div
              className="absolute h-1.5 bg-orange-500 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm">
          {step === 0 && <StepOne form={form} update={update} onNext={() => setStep(1)} />}
          {step === 1 && <StepTwo form={form} update={update} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
          {step === 2 && <StepThree form={form} update={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <StepFour form={form} update={update} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
          {step === 4 && <StepFive form={form} update={update} onBack={() => setStep(3)} onSubmit={handleSubmit} submitting={submitting} error={error} />}
        </div>
      </div>
    </div>
  )
}
