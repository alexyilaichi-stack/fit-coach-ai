# FitCoach AI

**Your AI coach that turns fitness data into a daily prescription.**

Live demo: [fitcoach-ai.vercel.app](https://my-hackathon-project-ten.vercel.app) &nbsp;·&nbsp; [Try with demo account →](#demo)

---

## What it does

Most fitness apps are silent reporters — they collect your data and show you charts. FitCoach AI is different: it reads your stats, current condition, and recent logs, then tells you exactly what to do today.

- **Training plan** — personalized workout with exercises, sets, reps, and suggested weight. Warns you about active injuries. Lets you swap any exercise by typing a request.
- **Nutrition** — empty state generates a full-day meal plan. After logging food, shows running macro totals and recommends what to eat next.
- **Quick Log** — one input for everything. Type a meal, injury, or workout note. Upload a food photo or Apple Health screenshot. Claude categorizes it and routes it to the right place automatically.
- **Injury tracking** — active injuries surface as warnings in your training plan. Claude semantically resolves them when you log recovery ("shoulder feels fine now").

---

## Demo

Log in at [my-hackathon-project-ten.vercel.app](https://my-hackathon-project-ten.vercel.app) with:

```
Email:    demo@fitcoach.ai
Password: fitcoachdemo
```

The demo account has pre-seeded body stats, a training plan, food logs, and an active injury so you can see every feature without entering data.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Routing | React Router v6 |
| Auth + DB | Supabase (PostgreSQL + RLS) |
| AI | Claude claude-sonnet-4-6 (Anthropic) |
| Deployment | Vercel (SPA + serverless function) |
| Language | English / Chinese (i18n built-in) |

---

## Architecture

```
Browser (React SPA)
    │
    ├── Supabase JS client  ──►  Supabase (auth, DB, storage)
    │
    └── fetch('/api/claude') ──►  Vercel serverless function
                                        │
                                        └── fetch('api.anthropic.com/v1/messages')
                                                │
                                                └── Claude claude-sonnet-4-6
```

All AI calls go through a single serverless function (`api/claude.js`) that acts as a typed proxy. The frontend sends `{ action, payload }` and gets back structured JSON — never raw text. This keeps the Claude API key server-side and makes every AI interaction testable in isolation.

**Key AI actions:**
- `generate_training_plan` — push/pull/legs/arms/full body session based on profile + injury history
- `process_quick_log` — detects all categories in one entry (food + injury simultaneously), returns structured data for each
- `generate_meal_plan` — full-day meal plan with per-meal macros
- `analyze_frequency` — reads last 14 days of workout logs, returns a coach note
- `swap_exercise` — modifies one exercise in the plan without touching the rest

---

## Running locally

```bash
git clone https://github.com/alexyilaichi/fitcoach-ai
cd fitcoach-ai
npm install
```

Copy `.env.example` to `.env` and fill in your keys:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
CLAUDE_API_KEY=
```

```bash
vercel dev   # runs frontend + api/claude.js locally
```

---

## Database schema

Five tables in Supabase, all with Row Level Security (`user_id = auth.uid()`):

- `user_profiles` — body stats, TDEE targets, onboarding data
- `training_plans` — daily workout JSON keyed by date
- `food_logs` — individual food entries with calorie + macro estimates
- `injury_logs` — injury/condition entries with `is_active` flag
- `quick_logs` — raw input + categories + AI response for every submission

---

## What I'd add with more time

- **Trend charts** — body weight, strength, body fat % over weeks (data is already in the DB)
- **Direct HealthKit integration** — replace screenshot upload with live Apple Health sync
- **Progress photos** — periodic body photos with AI-tracked visual changes
- **Data export** — download logs as CSV to share with a real coach
