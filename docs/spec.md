# FitCoach AI — Technical Spec

## Stack

| Layer | Tool | Rationale |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Fast dev server, minimal config, utility-first styling for a clean data-forward UI |
| Auth + Database + Storage | Supabase | Single BaaS handles everything backend — no custom server needed |
| AI | Claude API (claude-sonnet-4-6) | Vision for photo/screenshot analysis, reasoning for plan generation |
| API Proxy | Vercel Serverless Functions | Keeps Claude API key server-side — never exposed to browser |
| Deployment | Vercel | Zero-config deploy for Vite, auto-detects framework |

**Documentation links:**
- [Supabase + React quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)
- [Supabase Auth with React](https://supabase.com/docs/guides/auth/quickstarts/react)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Vite on Vercel](https://vercel.com/docs/frameworks/vite)
- [Anthropic API docs](https://docs.anthropic.com/en/api/getting-started)

---

## Runtime & Deployment

- **Runtime:** Web app, runs in the browser (SPA)
- **Dev:** `localhost:5173` via Vite dev server
- **Production:** Vercel — push to GitHub, Vercel auto-deploys
- **Environment variables required:**
  ```
  VITE_SUPABASE_URL          # Supabase project URL (safe to expose)
  VITE_SUPABASE_ANON_KEY     # Supabase anon key (safe to expose — RLS enforces access)
  CLAUDE_API_KEY             # Anthropic API key (server-side only, no VITE_ prefix)
  ```
- **SPA routing:** Add `vercel.json` to root to support deep linking:
  ```json
  { "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }] }
  ```

---

## Architecture Overview

```
Browser (React SPA on Vercel)
  │
  ├── Supabase JS client ──────→ Supabase Auth     (login/signup, session)
  │                        ├──→ Supabase DB        (user data, logs, plans)
  │                        └──→ Supabase Storage   (food photos, screenshots)
  │
  └── fetch('/api/claude') ───→ Vercel Function     (api/claude.js)
                                      │
                                      └──────────→ Claude API (Anthropic)
```

**Key principle:** React never calls Claude directly. All AI calls go through `api/claude.js` on Vercel, which holds the API key server-side. React calls `/api/claude`, gets a response, then writes results to Supabase.

**Cross-tab intelligence:** After any Quick Log submission, the app navigates to the primary destination tab. Each tab re-fetches its data fresh on every mount — no real-time subscriptions needed for v1.

---

## Auth & Routing

### Auth Layer
Implements `prd.md > Epic 1: User Authentication`

- Supabase Auth with email + password
- Session token stored in localStorage — persists across browser sessions
- `useAuth.js` hook exposes `user`, `signIn`, `signUp`, `signOut`
- On app load: if no session → redirect to `/login`; if session exists → check for profile → if no profile → redirect to `/onboarding`; otherwise → `/app/training`

### Route Structure
```
/login              → LoginPage.jsx        (signup + login)
/onboarding         → OnboardingPage.jsx   (runs once, guards on profile existence)
/app/training       → AppLayout + TrainingTab
/app/nutrition      → AppLayout + NutritionTab
/app/injury         → AppLayout + InjuryTab
/app/log            → AppLayout + QuickLogTab
```

`AppLayout.jsx` renders the persistent 4-tab bottom nav bar and wraps all `/app/*` routes. It checks auth on mount and redirects to `/login` if session is gone.

---

## Onboarding Flow

### Onboarding Wizard
Implements `prd.md > Epic 2: Onboarding & Body Profile Setup`

5-step wizard. Each step is its own screen with a progress indicator and "Next" button. Runs only once — gated by `user_profiles.onboarding_complete = true`.

```
Step 1: Basic stats      → height (cm), weight (kg), body fat (%), muscle mass (kg)
Step 2: Lifting weights  → bench press, squat, deadlift (kg) — optional fields
Step 3: Goal             → radio: "Lose weight" | "Build muscle" | "Other"
Step 4: Target           → free text (e.g. "bench 100kg by June")
Step 5: Current condition → free text (active injuries, how they're feeling)
```

### TDEE Calculation
On completion of Step 4, `lib/tdee.js` calculates daily targets using the Mifflin-St Jeor formula:
- BMR from height, weight (age defaulted to 25 if not collected)
- Activity multiplier: 1.55 (moderately active — assumed for gym-goers)
- Adjust for goal: muscle gain → BMR × 1.1; weight loss → BMR × 0.85
- Split macros: protein = 2g/kg bodyweight; fat = 25% of calories; carbs = remainder

These values (`daily_calories`, `daily_protein_g`, `daily_carbs_g`, `daily_fat_g`) are saved to `user_profiles`.

### Initial Plan Generation
After Step 5 submission, call `api/claude` with all onboarding data → Claude returns:
- A training plan JSON (array of exercises with sets/reps/weight)
- A brief opening assessment

Save training plan to `training_plans` with today's date as `plan_date`. Mark `onboarding_complete = true`. Navigate to `/app/training`.

---

## Training Plan Tab

### Plan Display
Implements `prd.md > Epic 3: Training Plan Tab`

On mount: fetch the `training_plans` row where `user_id = current user` AND `plan_date = today`. If none exists, call `api/claude` to generate one (daily reset at midnight). Show loading spinner during generation.

Renders a list of `ExerciseCard.jsx` components, each showing:
- Exercise name
- Sets × Reps (e.g. "4 × 8")
- Suggested weight (kg)
- Inline edit button (click to edit sets/reps/weight directly in place)

### AI Frequency Analysis
Above the exercise list, fetch the last 14 days of `quick_logs` where `categories` includes `'workout'`. Send this history to `api/claude` → Claude returns a short natural-language frequency observation (e.g., "You've trained chest 3 times this week — give it another day before loading it again. Today's plan emphasizes legs and back."). Renders as a coach note card above the exercises.

This is **not** a hardcoded threshold — Claude assesses the actual pattern (muscle groups, frequency, intensity) and generates a personalized note.

### Injury Warnings
Query `injury_logs` for active entries (`is_active = true`). For each active injury, check if today's plan includes a potentially conflicting movement. Render a visually distinct warning badge above the affected exercise (e.g., "Shoulder discomfort logged — consider substituting overhead press"). Uses `ExerciseCard.jsx` warning prop.

### Exercise Customization
Two modes, both persist until next plan generation:
1. **AI swap** — text input below plan: "replace deadlift with something easier on my lower back" → send current plan + request to `api/claude` → Claude returns modified plan array → update `training_plans` row → re-render
2. **Inline edit** — click sets/reps/weight in `ExerciseCard.jsx` → input appears in place → save on blur → update `training_plans.plan_json`

### Error Fallback
If plan generation fails: show yesterday's plan (fetch most recent `training_plans` row) with a "Showing previous plan — tap to retry" banner.

---

## Nutrition Tab

### Daily Targets Panel
Implements `prd.md > Epic 4: Nutrition Tab`

Always visible at the top of the tab, regardless of log state. Shows `MacroBar.jsx` for each macro:
```
Calories      2,100 kcal   [████████░░]  1,240 logged
Protein         150g       [██████░░░░]     92g logged
Carbohydrates   220g       [████░░░░░░]     80g logged
Fat              70g       [███████░░░]     48g logged
```
Targets from `user_profiles`. Running totals summed from today's `food_logs`.

### Empty State
No `food_logs` for today → call `api/claude` with user profile + TDEE targets → Claude returns a structured full-day meal plan (breakfast, lunch, dinner, snacks) with meal names, portions, and estimated calories/macros per meal. Renders as a meal plan list below the targets panel.

### Logged State
`food_logs` exist for today → renders chronological list of `FoodEntry.jsx` components, each showing:
- Food name + quantity
- Calories | Protein | Carbs | Fat breakdown

Below the list: Claude's recommendation for remaining meals to hit daily targets. This recommendation is generated fresh when the tab mounts with logged data.

Tab auto-switches between empty and logged states based on whether `food_logs` has rows for today — no manual toggle.

---

## Injury & Body Condition Tab

### Body Stats Panel
Implements `prd.md > Epic 5: Injury & Body Condition Tab`

Top panel reads from `user_profiles`:
- Height, weight, body fat %, muscle mass
- Lifting weights (bench, squat, deadlift)
- Goal + target
- Daily macro targets

"Edit" button opens an inline form with all fields pre-filled. Save writes to `user_profiles`. Changes affect all future AI recommendations immediately (tabs re-fetch on next mount).

### Condition History
Bottom panel: chronological list of all `injury_logs` for the current user, rendered as `InjuryEntry.jsx` components. Each shows:
- Date logged
- Description
- Status badge: "Active" (red, `is_active = true`) or "Resolved" (grey)

Active entries (last 7 days or explicitly unresolved) are visually distinct — these feed the injury warnings in the Training Plan tab.

---

## Quick Log Tab

### Input Interface
Implements `prd.md > Epic 6: Quick Log`

Three input modes on one screen:

**Text input** (primary): Always-visible text area. Submit button sends to `api/claude`.

**Food photo**: Camera/file upload button → image uploaded to Supabase Storage → URL + image sent to `api/claude` (vision) → returns food identification + macros → shows `PhotoConfirm.jsx` modal → user confirms or cancels → on confirm, saves to `food_logs` and `quick_logs`; on cancel, deletes from Storage, nothing saved.

**Apple Health screenshot**: File upload → same vision flow, different prompt → Claude extracts:
```json
{
  "workout_duration_min": 45,
  "calories_burned": 380,
  "heart_rate_avg": 142,
  "heart_rate_max": 168,
  "training_load": 72,
  "workout_type": "strength training"
}
```
All three tabs refresh on next mount: training plan regenerates (new data), nutrition target adjusts for calorie burn, workout logged for frequency analysis.

### Claude Categorization — Critical Prompt
**This is the most important Claude call in the app.** The Quick Log prompt must:
1. Detect ALL categories present in one entry (one log can be food + injury simultaneously)
2. Write to all relevant tables, not just one
3. Return a specific, meaningful AI response — not just "logged"
4. Classify injury/condition logs with `is_active = true` for recent/unresolved issues
5. Handle nuanced inputs (e.g., "left and right arms have different strength, feels like an imbalance" → routes to `injury_logs` as active body condition AND returns: "Muscle imbalance between arms noted. Your training plan will prioritize unilateral movements to help even things out. Keep logging if it persists.")

Prompt must be tested carefully during `/build` before any other Quick Log work. See `lib/claude.js`.

### Post-Submission UX
After every successful submission:
1. Categorization badge appears (e.g., "Logged to Nutrition")
2. Completion animation plays (simple fade-in or checkmark)
3. AI text response renders below input
4. Input clears, ready for next entry
5. App navigates to primary destination tab (food → `/app/nutrition`, workout/injury → `/app/training`)

On failure: input stays filled, "Something went wrong — try again" message + retry button appears.

---

## AI Integration Layer

### `api/claude.js` — Vercel Serverless Function
All Claude API calls are proxied through this single Vercel serverless function. The frontend never calls Anthropic directly. `CLAUDE_API_KEY` is a server-side env var — never prefixed with `VITE_`, never in the browser.

**Endpoints (single function, action parameter routes internally):**

| Action | Trigger | Input | Output |
|---|---|---|---|
| `generate_onboarding_plan` | End of onboarding | User profile + condition | Training plan JSON + assessment |
| `generate_training_plan` | Daily reset / Apple Health upload | User profile + injury logs + workout history | Training plan JSON |
| `analyze_frequency` | Training tab mount | Last 14 days workout logs | Natural language frequency note |
| `generate_meal_plan` | Nutrition empty state | User profile + TDEE targets | Structured meal plan |
| `recommend_remaining_meals` | Nutrition logged state | Today's food_logs + TDEE targets | Text recommendation |
| `process_quick_log` | Quick Log submission | Raw text + optional image URL + user profile + today's context | Categories array + structured data per category + ai_response |
| `swap_exercise` | Training tab swap request | Current plan + swap request | Modified plan JSON |

All actions use `claude-sonnet-4-6`. Vision actions (food photo, Apple Health screenshot) pass `image_url` in the message content.

### `lib/claude.js` — Frontend Client
Thin wrapper that calls `/api/claude` with `fetch`. All prompt templates live in `api/claude.js` on the server — `lib/claude.js` just passes action + payload.

---

## Data Model

All tables use Supabase Auth `auth.uid()` for RLS. Every table has RLS enabled with policy: `user_id = auth.uid()`.

### `user_profiles`
```
id                  uuid, PK, default gen_random_uuid()
user_id             uuid, FK → auth.users, UNIQUE
height_cm           float
weight_kg           float
body_fat_pct        float
muscle_mass_kg      float
bench_kg            float, nullable
squat_kg            float, nullable
deadlift_kg         float, nullable
goal                text  ('weight_loss' | 'muscle_gain' | 'other')
target              text
current_condition   text
daily_calories      int
daily_protein_g     int
daily_carbs_g       int
daily_fat_g         int
onboarding_complete boolean, default false
created_at          timestamptz, default now()
updated_at          timestamptz, default now()
```

### `training_plans`
```
id              uuid, PK
user_id         uuid, FK → auth.users
plan_date       date
plan_json       jsonb   -- [{ exercise, sets, reps, weight_kg, warning? }]
frequency_note  text
is_active       boolean, default true
generated_at    timestamptz, default now()
```
Unique constraint: `(user_id, plan_date)` — one plan per user per day.

### `food_logs`
```
id              uuid, PK
user_id         uuid, FK → auth.users
description     text
calories        int
protein_g       float
carbs_g         float
fat_g           float
image_url       text, nullable
logged_at       timestamptz, default now()
```

### `injury_logs`
```
id              uuid, PK
user_id         uuid, FK → auth.users
description     text
is_active       boolean, default true
resolved_at     timestamptz, nullable
logged_at       timestamptz, default now()
```

### `quick_logs`
```
id              uuid, PK
user_id         uuid, FK → auth.users
raw_input       text
categories      text[]   -- e.g. ['food', 'injury'], ['workout'], ['apple_health']
ai_response     text
image_url       text, nullable
logged_at       timestamptz, default now()
```

---

## File Structure

```
fitcoach-ai/
├── api/
│   └── claude.js              # Vercel serverless function — all Claude prompts live here
│
├── src/
│   ├── main.jsx               # React entry point
│   ├── App.jsx                # Router: /login, /onboarding, /app/*
│   ├── supabaseClient.js      # Supabase client init (reads VITE_ env vars)
│   │
│   ├── pages/
│   │   ├── LoginPage.jsx      # Signup + login form
│   │   ├── OnboardingPage.jsx # 5-step wizard, redirects on complete
│   │   └── AppLayout.jsx      # Tab bar shell + auth guard for /app/*
│   │
│   ├── tabs/
│   │   ├── TrainingTab.jsx    # Plan display, frequency note, injury warnings, swap/edit
│   │   ├── NutritionTab.jsx   # Macro targets panel + empty/logged states
│   │   ├── InjuryTab.jsx      # Body stats profile + condition history
│   │   └── QuickLogTab.jsx    # Text + photo + screenshot input + feedback
│   │
│   ├── components/
│   │   ├── ExerciseCard.jsx   # Single exercise row with inline edit + warning prop
│   │   ├── MacroBar.jsx       # Progress bar for one macro (label, target, current)
│   │   ├── FoodEntry.jsx      # Single food log row with macro breakdown
│   │   ├── InjuryEntry.jsx    # Single condition log row with active/resolved badge
│   │   ├── LogFeedback.jsx    # Post-submit badge + animation + AI response display
│   │   └── PhotoConfirm.jsx   # Food photo confirmation modal
│   │
│   ├── lib/
│   │   ├── claude.js          # fetch('/api/claude') wrapper — no prompts here
│   │   ├── tdee.js            # Mifflin-St Jeor TDEE + macro split calculation
│   │   └── planReset.js       # Checks today's plan existence, triggers generation
│   │
│   └── hooks/
│       ├── useAuth.js         # Supabase auth state (user, signIn, signUp, signOut)
│       ├── useProfile.js      # Fetch + update user_profiles
│       └── useTodayLogs.js    # Fetch today's food_logs + injury_logs (active)
│
├── docs/                      # Hackathon artifacts (scope, prd, spec, checklist, etc.)
├── process-notes.md
├── .env                       # Local env vars (gitignored)
├── .env.example               # Template for required env vars
├── vercel.json                # SPA rewrite rules
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Key Technical Decisions

**1. Vercel serverless function as Claude API proxy**
- What: All Claude calls go through `api/claude.js`, never directly from the browser
- Why: Claude API key must not be exposed client-side for a product shipping to real users
- Tradeoff: Slightly more setup than calling Claude directly from React; worth it from day one

**2. Navigate-and-refetch over Supabase Realtime**
- What: After Quick Log submission, app navigates to destination tab; each tab re-fetches on mount
- Why: Simpler to build, debug, and reason about for v1; no subscription management
- Tradeoff: Not live-updating if two sessions are open simultaneously — acceptable for a personal tool

**3. TDEE formula for nutrition targets instead of AI-generated**
- What: `lib/tdee.js` calculates calorie + macro targets from onboarding data at signup
- Why: Deterministic, fast, no API call needed; targets stored in `user_profiles` for all tabs to read
- Tradeoff: Uses assumed activity level (moderately active); user can update stats to recalculate

---

## Dependencies & External Services

| Service | Purpose | Docs | Notes |
|---|---|---|---|
| `@supabase/supabase-js` | DB, auth, storage client | [docs](https://supabase.com/docs/reference/javascript) | Free tier: 500MB DB, 1GB storage |
| `@anthropic-ai/sdk` | Claude API (server-side only) | [docs](https://docs.anthropic.com/en/api/getting-started) | claude-sonnet-4-6 for all calls |
| `react-router-dom` | Client-side routing | [docs](https://reactrouter.com/en/main) | v6+ |
| `tailwindcss` | Styling | [docs](https://tailwindcss.com/docs) | v3+ |
| Vercel | Hosting + serverless functions | [docs](https://vercel.com/docs) | Free Hobby tier sufficient |
| Supabase | BaaS (auth + DB + storage) | [docs](https://supabase.com/docs) | Free tier sufficient for hackathon |

**Environment variables checklist before `/build`:**
- [ ] Supabase project created → `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- [ ] Anthropic API key obtained → `CLAUDE_API_KEY` (server-side, no VITE_ prefix)
- [ ] Vercel project linked to GitHub repo
- [ ] All env vars added to Vercel dashboard (Settings → Environment Variables)

---

## Error Handling

Three rules, applied consistently:

1. **Loading spinner for every Claude call** — spinner with contextual label ("Generating your plan...", "Analyzing your log..."). Never a blank screen.
2. **Last known data as fallback** — if training plan generation fails, show the most recent plan from `training_plans` with a "Showing previous plan — tap to retry" banner.
3. **Quick Log failure → retry button** — input stays filled, error message shown, retry button re-submits. Nothing lost.

---

## Demo Seed Script

`scripts/seed.js` — run once before a demo to populate a fresh account with:
- A complete `user_profiles` row (realistic stats)
- A `training_plans` row for today
- 3–4 `food_logs` from this morning
- 1 active `injury_log` (e.g., "mild shoulder discomfort during press")

Run with: `node scripts/seed.js`

This is for demo purposes only — real users onboard through the wizard.

---

## Open Issues

1. **Age not collected in onboarding** — TDEE formula uses a defaulted age of 25. Consider adding age to Step 1 for more accurate calorie targets in v2.
2. **Apple Health screenshot variability** — screenshot formats vary by iPhone model and iOS version. The Claude vision prompt should be written defensively: extract what's visible, set missing fields to null, never crash on partial data. Test with 2–3 real screenshots before finalizing the prompt.
3. **Plan conflict detection for injury warnings** — the Training tab must match injury descriptions (free text) to exercise names in the plan. This is a fuzzy match handled by Claude. Prompt must handle edge cases where the injury is vague (e.g., "feeling off" shouldn't block any exercise).
4. **Resolved injury logic** — currently, "active" = logged within 7 days. A v2 improvement: let users explicitly mark an injury as resolved via the Injury tab. The data model (`resolved_at`) already supports this.
