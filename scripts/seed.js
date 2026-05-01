// Demo seed script — populates a fresh account with realistic data for presentations.
// Usage: node scripts/seed.js <email> <password>
// Or set SEED_EMAIL and SEED_PASSWORD in .env

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    for (const line of raw.split('\n')) {
      const eqIdx = line.indexOf('=')
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim()
        const val = line.slice(eqIdx + 1).trim()
        if (key && !process.env[key]) process.env[key] = val
      }
    }
  } catch {}
}
loadEnv()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY
const EMAIL    = process.env.SEED_EMAIL    || process.argv[2]
const PASSWORD = process.env.SEED_PASSWORD || process.argv[3]

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}
if (!EMAIL || !PASSWORD) {
  console.error('Usage: node scripts/seed.js <email> <password>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function seed() {
  console.log(`Signing in as ${EMAIL}...`)
  let session
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (signInError) {
    console.log('  Sign-in failed, attempting sign-up...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: EMAIL, password: PASSWORD })
    if (signUpError) { console.error('Auth failed:', signUpError.message); process.exit(1) }
    if (!signUpData.session) {
      console.error('Sign-up succeeded but no session — email confirmation is required.')
      console.error('Go to Supabase dashboard → Authentication → Settings → disable "Enable email confirmations", then re-run.')
      process.exit(1)
    }
    session = signUpData.session
  } else {
    session = signInData.session
  }

  const userId = session.user.id
  const today = new Date().toISOString().split('T')[0]
  console.log(`Seeding for user ${userId}...`)

  // --- user_profiles ---
  const { error: profileError } = await supabase.from('user_profiles').upsert({
    user_id: userId,
    height_cm: 178,
    weight_kg: 78,
    body_fat_pct: 16,
    muscle_mass_kg: 38,
    bench_kg: 80,
    squat_kg: 110,
    deadlift_kg: 130,
    goal: 'muscle_gain',
    target: 'Bench 100kg by summer, build visible abs',
    current_condition: 'Mild shoulder discomfort on overhead movements',
    daily_calories: 2800,
    daily_protein_g: 180,
    daily_carbs_g: 310,
    daily_fat_g: 80,
    onboarding_complete: true,
  }, { onConflict: 'user_id' })
  if (profileError) { console.error('  ✗ user_profiles:', profileError.message) }
  else { console.log('  ✓ user_profiles') }

  // --- training_plans ---
  const plan = {
    workout_type: 'push',
    workout_focus: 'Push — Chest, Shoulders & Triceps',
    exercises: [
      { exercise: 'Bench Press',            sets: 4, reps: 8,  weight_kg: 77.5, muscle_group: 'Chest'     },
      { exercise: 'Incline Dumbbell Press', sets: 3, reps: 10, weight_kg: 30,   muscle_group: 'Chest'     },
      { exercise: 'Cable Fly',              sets: 3, reps: 12, weight_kg: 15,   muscle_group: 'Chest'     },
      { exercise: 'Shoulder Press',         sets: 4, reps: 8,  weight_kg: 50,   muscle_group: 'Shoulders' },
      { exercise: 'Lateral Raise',          sets: 3, reps: 15, weight_kg: 12,   muscle_group: 'Shoulders' },
      { exercise: 'Tricep Pushdown',        sets: 3, reps: 12, weight_kg: 30,   muscle_group: 'Triceps'   },
    ],
  }
  const { error: planError } = await supabase.from('training_plans').upsert({
    user_id: userId,
    plan_date: today,
    plan_json: plan,
    frequency_note: "You've hit push twice and pull once this week — good balance. Today's session targets chest strength and shoulder stability.",
    is_active: true,
  }, { onConflict: 'user_id,plan_date' })
  if (planError) { console.error('  ✗ training_plans:', planError.message) }
  else { console.log('  ✓ training_plans') }

  // --- food_logs (clear today's first, then insert) ---
  await supabase.from('food_logs').delete().eq('user_id', userId).gte('logged_at', `${today}T00:00:00`)
  const d = new Date(); d.setHours(0, 0, 0, 0)
  const ts = (h, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).toISOString()
  const foods = [
    { description: 'Oatmeal with banana and peanut butter', calories: 480, protein_g: 18, carbs_g: 72, fat_g: 14, logged_at: ts(7, 30) },
    { description: '3 scrambled eggs with whole grain toast', calories: 420, protein_g: 28, carbs_g: 36, fat_g: 16, logged_at: ts(7, 35) },
    { description: 'Chicken breast with brown rice and broccoli', calories: 620, protein_g: 58, carbs_g: 68, fat_g: 10, logged_at: ts(12, 15) },
    { description: 'Greek yogurt with almonds', calories: 310, protein_g: 24, carbs_g: 16, fat_g: 14, logged_at: ts(15, 0) },
  ]
  const { error: foodError } = await supabase.from('food_logs').insert(foods.map(f => ({ ...f, user_id: userId })))
  if (foodError) { console.error('  ✗ food_logs:', foodError.message) }
  else { console.log('  ✓ food_logs (4 entries)') }

  // --- injury_logs ---
  const { error: injuryError } = await supabase.from('injury_logs').insert({
    user_id: userId,
    description: 'Mild shoulder discomfort during overhead press — front delt tightness, started 3 days ago',
    is_active: true,
  })
  if (injuryError) { console.error('  ✗ injury_logs:', injuryError.message) }
  else { console.log('  ✓ injury_logs') }

  // --- quick_logs (a couple of entries to populate frequency history) ---
  const { error: qError } = await supabase.from('quick_logs').insert([
    { user_id: userId, raw_input: 'Did push day — bench 77.5kg x4, cable flys, shoulder press', categories: ['workout'], ai_response: 'Solid push session logged.', logged_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { user_id: userId, raw_input: 'Pull day — lat pulldown, rows, hammer curls', categories: ['workout'], ai_response: 'Pull session logged. Good back volume.', logged_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
    { user_id: userId, raw_input: 'left shoulder a bit sore after overhead press', categories: ['injury'], ai_response: 'Shoulder discomfort noted. Will flag conflicting exercises.', logged_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  ])
  if (qError) { console.error('  ✗ quick_logs:', qError.message) }
  else { console.log('  ✓ quick_logs (3 entries)') }

  console.log(`\nDone. Open the app and sign in with: ${EMAIL}`)
}

seed().catch(err => { console.error(err); process.exit(1) })
