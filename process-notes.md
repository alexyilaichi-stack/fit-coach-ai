# Process Notes

## /scope

- **Idea evolution:** Alex arrived with 8+ ideas across quant finance, business analytics, anime, and personal health. He initially gravitated toward finance tools (Narrative Tracker, 13F tracker) because they sounded impressive for quant recruiters. Pivoted to personal health after being asked what he'd actually use himself — revealed a real daily habit (asking AI for news, getting frustrated by stale data) and a genuine fitness frustration (Apple Watch reports but never advises).
- **Final direction:** AI fitness coach — daily check-in + anytime logging, generates personalized training program + corrective exercises + nutrition advice. Differentiator: the "so what" layer that Apple Watch and other apps skip.
- **Key pushback moments:** (1) Challenged on "all" for feature scope → Alex cut sleep and restaurant recommendations without resistance. (2) Challenged on building for recruiter vs. building what he knows → Alex honestly admitted he understands anime better than quant finance, which surfaced the authentic pivot to personal health.
- **References that resonated:** Apple Watch's "training load is high → and then nothing" was the core insight Alex articulated himself. He also independently proposed the screenshot upload idea as a workaround for Apple Health integration complexity.
- **Deepening rounds:** 1 round. Surfaced the hybrid check-in + anytime logging interface concept and the screenshot upload workaround for Apple Health. Both materially improved the scope doc.
- **Active shaping:** Alex drove several key decisions independently: the "complement Apple Health, don't replace it" framing, the screenshot hack, the training-first prioritization. Passively accepted cuts to sleep/restaurants when challenged. Overall: active on product vision, passive on scope trimming.

## /prd

- **Key changes from scope doc:** Restructured from "morning check-in + anytime log" to a 4-tab app (训练计划, 饮食, 伤病, Quick Log). Apple Health upload moved from morning to post-workout. User login + database added as a must-have (Alex was firm on this).
- **"What if" surprises:** Cross-tab interactions (injury log → training plan warning) wasn't in the scope doc — surfaced naturally during the interview. Empty state for nutrition tab (no food logged → full day plan) also emerged organically.
- **Scope guard moments:** ML-based injury pattern learning was proposed and redirected to "AI reasoning over logs" — Alex accepted this after the explanation. Login + database was added as must-have despite the time cost — Alex held firm.
- **Strong opinions:** Alex was decisive about: user auth being non-negotiable, food photo confirmation step, AI chatbot-style response after every Quick Log entry. Deferred on: onboarding form design, plan display location.
- **Deepening rounds:** 1 round. Surfaced: Quick Log feedback UX (animation + AI response), onboarding as a guided tutorial (not flat form), food photo confirmation flow, data persistence decision (led directly to the login requirement). All materially strengthened acceptance criteria.
- **Active shaping:** Alex drove the three-tab restructure, the "both swap via AI and direct edit" dual interaction model, and the two-state nutrition tab. Passively accepted the ML redirect. Pushed back on localStorage — elevated database to must-have independently.

## /spec

- **Stack decision:** React + Vite + Supabase + Vercel. Alex has no JS/React experience but is a vibe coder — Claude writes all the code, so framework knowledge isn't a blocker. Supabase chosen as BaaS to eliminate custom backend work.
- **Deployment:** Live URL on Vercel. Chose this over local-only — Alex wants to ship a real product.
- **Security decisions:** Two production-grade decisions made upfront: (1) Vercel serverless function as Claude API proxy — key never in browser; (2) Supabase Row Level Security on all tables — data always user-scoped. Both added because Alex stated market intent.
- **Architecture decisions:** 5-step onboarding wizard → TDEE calculation → initial plan generation. Daily plan reset at midnight. Navigate-and-refetch (Option A) over Supabase Realtime for cross-tab updates — simpler, more reliable for v1.
- **Frequency analysis:** Alex pushed back on hardcoded threshold approach — upgraded to AI-driven frequency analysis using 14 days of workout history. Claude assesses actual patterns (muscle groups, intensity) rather than just counting days.
- **Nutrition tab:** Alex requested explicit macro breakdown panel (calories, protein, carbs, fat with progress bars) on top of both empty/logged states. Added daily targets panel as persistent UI element.
- **Quick Log prompt:** Identified as the most critical Claude call. Must handle multi-category entries, write to multiple tables simultaneously, and return specific meaningful responses (not generic "logged" confirmations). Alex's example: muscle imbalance log → injury_logs + AI coaching response.
- **Demo flow:** Alex plans to open with Quick Log to show immediate AI intelligence. Demo seed script added to spec for pre-populating a realistic account before demos.
- **Market intent:** Alex stated he wants to ship this as a real product. Architecture reflects production-grade decisions from the start — no hackathon shortcuts that would need rebuilding.
- **Active shaping:** Alex drove the frequency analysis upgrade (AI not counting), the macro breakdown panel addition, and the market ambition framing. Deferred to agent on: stack choice, error handling strategy, cross-tab state management approach, deepening round cutoff.
- **Deepening rounds:** 1 round. Surfaced: error handling strategy (3 rules), Apple Health screenshot schema (structured JSON extraction), demo flow + seed script need, market intent (production-grade decisions), cross-tab state management (Option A: navigate + refetch).

## /onboard

- **Technical experience:** First-year programmer, Python + SQL, primarily vibe coding with Claude Code. No deep code knowledge yet — AI does the heavy lifting.
- **Learning goals:** Wants to become a hackathoner — fast, confident, shipping real things. Eyeing quant finance internships and needs portfolio pieces.
- **Creative sensibility:** Utility-focused. Drawn to data-rich tools that solve real problems in his life (stock monitoring, personal aggregator, finance). No strong aesthetic references — clean and functional is the default.
- **Prior SDD experience:** None formally. Has asked Claude Code for plans before executing, but never driven the spec process himself. Good baseline for /reflect to probe the shift from passive to active planning.
- **Energy and engagement:** Enthusiastic, has multiple ideas ready to go, encouraged follow-up questions. Fast mover — should respond well to brisk pacing.

## /build

### Step 2: Supabase project setup + database tables
- What was built: Created Supabase project (etabovjtwcvkiszcjmaz). Ran SQL to create all five tables (user_profiles, training_plans, food_logs, injury_logs, quick_logs) with exact spec schemas. RLS enabled and policy added on all five tables. Real credentials filled into .env (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY). supabaseClient.js was already correctly scaffolded from Step 1.
- Verification observation: All 5 tables visible in Table Editor. Authentication → Policies confirmed all 5 tables have "Disable RLS" button (RLS enabled) and one policy each covering ALL operations.
- Issues: None.

### Step 3: Auth — login page + session management
- What was built: Built `LoginPage.jsx` with email + password signup/login toggle, error + info message display, and post-auth navigation. Added `RequireAuth` wrapper to `App.jsx` that gates all `/app/*` and `/onboarding` routes — shows loading spinner while session is being checked, redirects to `/login` if no user. Built `AppLayout.jsx` with profile check on mount (queries `user_profiles` → redirects to `/onboarding` if no complete profile) and a fixed 4-tab bottom nav bar (Training, Nutrition, Body, Log) using `NavLink` with active-state highlighting. Build produced 84 modules with no errors.
- Issues: None.

### Step 1: Project scaffolding
- What was built: Scaffolded full Vite + React project manually. Installed all dependencies (react-router-dom, tailwindcss, @supabase/supabase-js, @anthropic-ai/sdk). Configured Tailwind + PostCSS. Created all directories (src/pages, src/tabs, src/components, src/lib, src/hooks, api/, scripts/). Created placeholder exports for every file in the spec. Created .env.example, .env with placeholders, vercel.json with SPA rewrite, vite.config.js, index.html titled "FitCoach AI". Git initialized and committed.
- Verification observation: `npm run dev` started Vite at localhost:5173 in 357ms with no errors.
- Issues: `timeout` command not available on macOS (GNU coreutils not installed) — used background process + sleep instead. No functional impact.

## /checklist

- **Sequencing decisions:** Foundation-first order: scaffolding → Supabase → auth → Claude proxy → onboarding → Quick Log → tabs → polish → deploy → Devpost. Alex initially wanted to start with Quick Log — explained the dependency chain (needs auth, tables, and Claude proxy to function) and he accepted the logic immediately.
- **Build mode:** Step-by-step. Recommended for Alex given beginner level and the app's interconnected complexity. Alex agreed without pushback.
- **Comprehension checks:** No — Alex chose to focus on building, skip check-ins.
- **Verification:** Yes — verify after each step before moving on. Alex agreed this was the right call.
- **Git cadence:** Commit after each item.
- **Check-in cadence:** N/A (no comprehension checks).
- **Item count:** 12 items. Estimated 4-5 hours total.
- **Time concern:** Alex noted the estimate felt longer than expected, then said "just do it" — he accepted the plan without consolidation.
- **Submission planning:** Quick Log identified as the "wow moment" for Devpost — universal input with AI auto-categorization is the demo opener. Plans to deploy live on Vercel. No GitHub repo yet — creation is baked into Step 11. Screenshots planned: Quick Log with AI response, Training Plan tab, Nutrition tab with macro bars.
- **Deepening rounds:** 0 rounds. Alex moved straight through all questions and accepted the checklist as proposed. No deepening.
- **Active shaping:** Alex correctly identified Quick Log as the most important piece and wanted to build it first — showed good product intuition. Accepted the sequencing rationale without resistance. Passively accepted all build preferences except comprehension checks (opted out). Did not question item granularity or order after the explanation.

### Step 4: Claude API proxy (Vercel serverless function)
- What was built: `api/claude.js` was already scaffolded in Step 1 with all 7 action stubs returning mock responses and Anthropic SDK initialized with `CLAUDE_API_KEY`. `src/lib/claude.js` fetch wrapper was also already in place. Linked the project to Vercel (`vercel link --yes`). Fixed `vercel.json` rewrite pattern to exclude Vite dev routes (`@`, `src/`, `node_modules/`, and file extensions) — the original broad pattern was intercepting Vite's HMR and module requests in `vercel dev`.
- Verification observation: curl to `POST /api/claude` with `generate_onboarding_plan` returned `{"mock":true,"action":"generate_onboarding_plan","message":"Mock onboarding plan response"}`. App loaded at localhost:3000 showing the FitCoach AI login page cleanly after the vercel.json fix.
- Issues: Original SPA rewrite rule `/((?!api/).*)` was too broad — intercepted Vite's `@vite/client`, `@react-refresh`, `src/main.jsx` routes and returned index.html instead. Fixed with pattern that excludes `@`-prefixed paths and file extensions.
