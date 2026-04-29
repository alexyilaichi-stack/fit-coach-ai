# Build Checklist

## Build Preferences

- **Build mode:** Step-by-step
- **Comprehension checks:** No
- **Git:** Commit after each item with message: "Complete step N: [title]"
- **Verification:** Yes — after each item, run the dev server and confirm what you see before moving on
- **Check-in cadence:** N/A (no comprehension checks — focus on building)

## Checklist

- [x] **1. Project scaffolding**
  Spec ref: `spec.md > Stack` and `spec.md > Runtime & Deployment` and `spec.md > File Structure`
  What to build: Scaffold a new Vite + React project. Install dependencies: `react-router-dom`, `tailwindcss`, `@supabase/supabase-js`, `@anthropic-ai/sdk`. Configure Tailwind. Create the full file/folder structure from the spec (`src/pages/`, `src/tabs/`, `src/components/`, `src/lib/`, `src/hooks/`, `api/`, `docs/`, `scripts/`). Create placeholder files for every component, page, tab, hook, and lib file listed in the spec — empty exports are fine. Create `.env.example` listing all three required env vars. Create `.env` with placeholder values. Create `vercel.json` with the SPA rewrite rule. Create `vite.config.js` with base config. Update `index.html` title to "FitCoach AI".
  Acceptance: `npm run dev` starts without errors. Browser shows a blank or placeholder page at `localhost:5173`. No missing import errors in the console.
  Verify: Run `npm run dev` and open `localhost:5173`. Confirm the page loads without a white-screen crash or console errors.

- [x] **2. Supabase project setup + database tables**
  Spec ref: `spec.md > Data Model`
  What to build: Create a Supabase project (free tier). In the Supabase SQL editor, create all five tables: `user_profiles`, `training_plans`, `food_logs`, `injury_logs`, `quick_logs` — using the exact schemas from the spec. Enable Row Level Security on all five tables. Add RLS policy to each table: `user_id = auth.uid()` for SELECT, INSERT, UPDATE, DELETE. In `src/supabaseClient.js`, initialize the Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Copy real values from Supabase dashboard into `.env`.
  Acceptance: All five tables visible in Supabase dashboard with correct columns. RLS enabled on each. `supabaseClient.js` exports a working client.
  Verify: Open Supabase dashboard → Table Editor. Confirm all five tables exist with the correct columns. Check that RLS is enabled (shield icon visible on each table).

- [ ] **3. Auth — login page + session management**
  Spec ref: `spec.md > Auth & Routing`
  What to build: Build `LoginPage.jsx` with email + password signup and login forms (toggle between the two). Implement `useAuth.js` hook exposing `user`, `signIn`, `signUp`, `signOut` using Supabase Auth. In `App.jsx`, set up React Router with routes: `/login`, `/onboarding`, `/app/training`, `/app/nutrition`, `/app/injury`, `/app/log`. Add auth guard logic: no session → redirect to `/login`; session but no profile → redirect to `/onboarding`; session + profile → stay on `/app/*`. Build `AppLayout.jsx` with a 4-tab bottom nav bar (Training, Nutrition, Injury, Quick Log) linking to the four `/app/*` routes. Tab pages can be empty placeholders for now.
  Acceptance: Can sign up with a new email. Can log in with that email. Logged-in state persists after browser refresh. Navigating to `/app/training` while logged out redirects to `/login`.
  Verify: Sign up with a test email. Refresh the page — confirm you stay logged in. Open an incognito window and go to `localhost:5173/app/training` — confirm it redirects to `/login`.

- [ ] **4. Claude API proxy (Vercel serverless function)**
  Spec ref: `spec.md > AI Integration Layer > api/claude.js`
  What to build: Create `api/claude.js` as a Vercel serverless function. It receives POST requests with `{ action, payload }`. Implement a switch on `action` with stubs for all seven actions: `generate_onboarding_plan`, `generate_training_plan`, `analyze_frequency`, `generate_meal_plan`, `recommend_remaining_meals`, `process_quick_log`, `swap_exercise`. For now, each stub returns a hardcoded mock response so the frontend can be wired up before prompts are finalized. Initialize the Anthropic SDK using `CLAUDE_API_KEY` (no `VITE_` prefix — server-side only). Set `CLAUDE_API_KEY` in `.env`. Implement `src/lib/claude.js` as a thin `fetch('/api/claude', { method: 'POST', body: JSON.stringify({ action, payload }) })` wrapper. Install the Vercel CLI (`npm i -g vercel`) and run `vercel dev` to test the function locally.
  Acceptance: `POST /api/claude` with `{ action: 'generate_onboarding_plan', payload: {} }` returns a mock response. The Anthropic SDK initializes without throwing (key is present). `lib/claude.js` can call the proxy from the browser without CORS errors.
  Verify: Run `vercel dev`. In the browser console, call `fetch('/api/claude', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'generate_onboarding_plan', payload: {} }) }).then(r => r.json()).then(console.log)`. Confirm a mock response prints in the console.

- [ ] **5. Onboarding wizard + TDEE calculation + initial plan generation**
  Spec ref: `spec.md > Onboarding Flow`
  What to build: Build `OnboardingPage.jsx` as a 5-step wizard with a progress indicator and "Next" / "Submit" buttons. Step 1: height (cm), weight (kg), body fat (%), muscle mass (kg). Step 2: bench press, squat, deadlift (kg) — optional. Step 3: goal radio (Lose weight / Build muscle / Other). Step 4: target (free text). Step 5: current condition (free text). Implement `lib/tdee.js` with the Mifflin-St Jeor formula: BMR from height + weight (age defaults to 25), activity multiplier 1.55, goal adjustment (muscle gain × 1.1, weight loss × 0.85), macro split (protein = 2g/kg, fat = 25% cals, carbs = remainder). On Step 4 completion, calculate TDEE. On Step 5 submission: call `api/claude` with action `generate_onboarding_plan` and all onboarding data → write the real Claude prompt for this action in `api/claude.js` → Claude returns training plan JSON + assessment text. Save `user_profiles` row (all stats + TDEE targets + `onboarding_complete = true`). Save `training_plans` row for today. Navigate to `/app/training`.
  Acceptance: Can complete all 5 steps. After submission, `user_profiles` row exists in Supabase with correct data and `onboarding_complete = true`. `training_plans` has a row for today with a real Claude-generated plan. App navigates to `/app/training`.
  Verify: Complete onboarding with test data. Check Supabase Table Editor — confirm `user_profiles` and `training_plans` rows exist with real data. Navigate to `/app/training` and confirm you land there (even if the tab is still a placeholder).

- [ ] **6. Quick Log tab — text, photo, screenshot + Claude categorization**
  Spec ref: `spec.md > Quick Log Tab` and `spec.md > AI Integration Layer > process_quick_log`
  What to build: Build `QuickLogTab.jsx` with three input modes: (1) always-visible text area with submit button; (2) camera/file upload button for food photos — upload to Supabase Storage, pass image URL to Claude vision; (3) file upload for Apple Health screenshots — same vision flow, different prompt. Write the `process_quick_log` prompt in `api/claude.js` — this is the most critical prompt in the app. It must: detect all categories in one entry, write to all relevant tables (`food_logs`, `injury_logs`, `quick_logs`, `training_plans` if Apple Health), classify injuries with `is_active = true`, return a specific meaningful AI response. Build `LogFeedback.jsx` — categorization badge, fade-in animation, AI response text. Build `PhotoConfirm.jsx` modal — shows AI food identification + estimated calories, confirm/cancel. On confirm: save to `food_logs` + `quick_logs`, navigate to `/app/nutrition`. On cancel: delete from Storage, nothing saved. On failure: show error message + retry button, input stays filled.
  Acceptance: Text log saves to `quick_logs` and correct secondary table. Food photo shows confirm modal before saving. Apple Health screenshot extracts workout data and writes to `training_plans`. AI response appears after every submission. Navigation to correct tab after submission.
  Verify: Submit a text food log ("just ate a banana"). Confirm it saves to `food_logs` and `quick_logs` in Supabase. Upload a food photo — confirm the confirm modal appears. Submit a text injury log ("left shoulder hurts") — confirm it saves to `injury_logs` with `is_active = true`.

- [ ] **7. Training Plan tab — plan display + frequency note + injury warnings + swap/edit**
  Spec ref: `spec.md > Training Plan Tab`
  What to build: Build `TrainingTab.jsx`. On mount: fetch today's `training_plans` row. If none, call `api/claude` with action `generate_training_plan` (write this prompt) — show loading spinner during generation. Build `ExerciseCard.jsx` showing exercise name, sets × reps, suggested weight, inline edit button. Inline edit: click sets/reps/weight → input appears in place → save on blur → update `training_plans.plan_json`. AI frequency note: fetch last 14 days of `quick_logs` where categories includes `'workout'`, call `api/claude` with action `analyze_frequency` (write this prompt) → render coach note card above exercises. Injury warnings: query `injury_logs` where `is_active = true` → for each active injury, render warning badge on conflicting `ExerciseCard` using warning prop. AI swap: text input below plan → call `api/claude` with action `swap_exercise` → update `training_plans` row → re-render. Error fallback: if plan generation fails, fetch most recent `training_plans` row and show "Showing previous plan — tap to retry" banner.
  Acceptance: Training plan renders with real exercises, sets, reps, weight. Frequency note appears above the plan. Active injury warning appears on conflicting exercise. Inline edit saves to Supabase. Swap request returns a modified plan.
  Verify: Load `/app/training`. Confirm the plan renders. Edit a set count inline — refresh the page and confirm it persisted. Check that an active injury log (from Step 6) shows a warning badge on a relevant exercise.

- [ ] **8. Nutrition tab — macro targets panel + empty/logged states**
  Spec ref: `spec.md > Nutrition Tab`
  What to build: Build `NutritionTab.jsx`. Always-visible top panel: build `MacroBar.jsx` showing label, target (from `user_profiles`), and running total (summed from today's `food_logs`) for calories, protein, carbs, fat — rendered as progress bars. Empty state (no `food_logs` today): call `api/claude` with action `generate_meal_plan` (write this prompt) → Claude returns structured breakfast/lunch/dinner/snacks plan with portions and estimated macros → render as meal plan list below targets panel. Logged state (`food_logs` exist today): render chronological list of `FoodEntry.jsx` components (food name, quantity, calories, protein, carbs, fat). Below the list: call `api/claude` with action `recommend_remaining_meals` (write this prompt) → render AI recommendation for remaining meals. Tab auto-switches between empty and logged states based on today's `food_logs`.
  Acceptance: Macro bars show correct targets from `user_profiles`. Empty state shows a full-day meal plan. After logging food via Quick Log, logged state shows food entries + remaining recommendation. Running totals update correctly.
  Verify: Open `/app/nutrition` with no food logged — confirm meal plan appears. Log a food item via Quick Log, then return to `/app/nutrition` — confirm it switches to logged state and the macro bar updates.

- [ ] **9. Injury & Body Condition tab — stats panel + condition history**
  Spec ref: `spec.md > Injury & Body Condition Tab`
  What to build: Build `InjuryTab.jsx`. Top panel: display all stats from `user_profiles` — height, weight, body fat %, muscle mass, bench/squat/deadlift, goal, target, daily macro targets. "Edit" button opens an inline form pre-filled with all fields. Save writes updated values to `user_profiles`. Bottom panel: fetch all `injury_logs` for current user, render chronologically as `InjuryEntry.jsx` components. Each shows: date, description, status badge ("Active" in red if `is_active = true`, "Resolved" in grey). Active entries (last 7 days or `is_active = true`) are visually distinct.
  Acceptance: All onboarding stats display correctly. Edit form pre-fills current values. Saved changes persist after refresh. Injury log shows all entries with correct active/resolved badges.
  Verify: Open `/app/injury`. Confirm your onboarding stats appear. Click Edit, change your weight, save. Refresh — confirm the new weight persists. Confirm the shoulder injury logged in Step 6 appears as "Active."

- [ ] **10. Error handling + demo seed script**
  Spec ref: `spec.md > Error Handling` and `spec.md > Demo Seed Script`
  What to build: Apply three error handling rules across all tabs: (1) Loading spinner with contextual label for every Claude call — never a blank screen. (2) Training tab fallback: if plan generation fails, show most recent plan + "Showing previous plan — tap to retry" banner. (3) Quick Log failure: keep input filled, show "Something went wrong — try again" message + retry button. Create `scripts/seed.js` — node script that inserts into a fresh account: a complete `user_profiles` row with realistic stats, a `training_plans` row for today, 3-4 `food_logs` from this morning, 1 active `injury_log` ("mild shoulder discomfort during press"). Run `node scripts/seed.js` to confirm it works.
  Acceptance: Loading spinners appear during all Claude calls. Training tab shows previous plan on failure. Quick Log shows retry button on failure. Seed script runs without errors and populates all four tables.
  Verify: Run `node scripts/seed.js` with a fresh Supabase account credentials. Open Supabase Table Editor and confirm all four tables have seed data. Temporarily break the Claude API key to trigger error states — confirm spinners and fallback messages appear.

- [ ] **11. GitHub repo + Vercel deployment**
  Spec ref: `spec.md > Runtime & Deployment`
  What to build: Create a new public GitHub repository named "fitcoach-ai". Initialize git in the project root (`git init`). Create `.gitignore` that excludes `.env`, `node_modules/`. Add the GitHub remote and push all code. Link the GitHub repo to a new Vercel project (via `vercel.com` dashboard or `vercel` CLI). Add all three environment variables to Vercel dashboard (Settings → Environment Variables): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `CLAUDE_API_KEY`. Trigger a deployment and confirm the live URL works end-to-end — create account, complete onboarding, submit a Quick Log.
  Acceptance: Code is live on GitHub. Vercel deployment succeeds (green checkmark). Live URL loads the app. Can sign up and complete onboarding on the live URL. All three env vars are set in Vercel dashboard.
  Verify: Open the Vercel-provided URL in an incognito window. Sign up with a new account. Complete onboarding. Submit a Quick Log. Confirm the AI response appears and data saves to Supabase.

- [ ] **12. Submit your project to Devpost**
  Spec ref: `prd.md > What We're Building`
  What to build: Walk through the Devpost submission form. Project name: "FitCoach AI". Tagline: something like "Your AI coach that turns fitness data into a daily prescription." Write the project story using `docs/scope.md` and `docs/prd.md` as source material — explain what you built, why (the Apple Health gap), and what you learned. Add "built with" tags: React, Vite, Tailwind CSS, Supabase, Claude AI, Vercel. Take screenshots of: (1) Quick Log with an AI response, (2) Training Plan tab with exercises + frequency note, (3) Nutrition tab with macro bars filled in. Link your GitHub repo. Link the live Vercel URL. Review everything and submit.
  Acceptance: Submission is live on Devpost with project name, tagline, description, built-with tags, at least 3 screenshots, GitHub repo link, and live app link. All required fields complete.
  Verify: Open your Devpost submission page. Confirm the green "Submitted" badge appears. Read the project description out loud — would someone who's never heard of FitCoach AI understand what it does and why it's cool?
