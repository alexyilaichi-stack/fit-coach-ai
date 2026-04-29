# FitCoach AI — Product Requirements

## Problem Statement

People who work out consistently have no shortage of fitness data — Apple Watch, gym logs, body composition scans. But none of these tools tell you what to *do* with the data. FitCoach AI closes that gap: a structured daily check-in app that reads your actual stats and condition, then prescribes your next workout, corrective exercises, and nutrition targets — like a coach who already knows everything about you.

---

## User Stories

### Epic 1: User Authentication

- As a new user, I want to create an account so that my data persists across devices and sessions.
  - [ ] Login/signup screen appears on first visit
  - [ ] User can sign up with email and password
  - [ ] User can log in with existing credentials
  - [ ] Logged-in state persists across browser sessions
  - [ ] All user data (logs, stats, plans) is tied to the account in the database

### Epic 2: Onboarding & Body Profile Setup

- As a new user, I want a guided setup flow so that the app understands my body and goals before generating any plans.
  - [ ] Guided onboarding flow launches after first login (not a flat form — step-by-step)
  - [ ] Collects: height, weight, body fat %, muscle mass, current lifting weights (e.g., bench press max)
  - [ ] Asks about fitness goal: weight loss, muscle gain, or other
  - [ ] Asks about current body condition (any active injuries, how they're feeling)
  - [ ] Asks for a quantifiable target (e.g., "lose 5kg by June", "bench 100kg")
  - [ ] At the end of onboarding, AI generates an initial training plan
  - [ ] Onboarding runs only once; body stats are editable afterward in the Injury tab

### Epic 3: Training Plan Tab (primary "wow" feature)

- As a user, I want to see my next workout with specific exercises so that I know exactly what to do in the gym.
  - [ ] Shows exercise name, sets, reps, and suggested weight for each movement
  - [ ] Recommendations are personalized to onboarding stats and goals
  - [ ] Plan updates when new Apple Health data is uploaded

- As a user, I want dynamic training frequency feedback so the app adjusts when I'm overdoing or under-doing it.
  - [ ] App detects recent training frequency from logs
  - [ ] Shows a prominent note when adjustment is recommended (e.g., "You've trained 5 days this week — rest day suggested")
  - [ ] Recommendation changes directionally based on frequency (less → push harder, more → back off)

- As a user, I want injury warnings in my training plan so I don't aggravate existing issues.
  - [ ] Active injury logs surface as warnings in the training plan (e.g., "Shoulder discomfort logged — avoid overhead press today")
  - [ ] AI applies exercise science knowledge to suggest safer modifications, not just removes the exercise
  - [ ] Warning is visually distinct (not buried in the plan text)

- As a user, I want to customize my workout plan so I'm not forced to do exercises I can't or don't want to do.
  - [ ] User can type a request to swap an exercise ("replace deadlift with something easier on my lower back") — AI generates a substitution
  - [ ] User can directly edit exercise details (sets, reps, weight) inline in the interface
  - [ ] Changes persist until next Apple Health upload triggers a fresh plan

### Epic 4: Nutrition Tab

- As a user who hasn't logged any food yet, I want a full-day meal plan so I know what to eat today.
  - [ ] Empty state: AI generates a structured meal plan (breakfast, lunch, dinner, snacks) based on onboarding goals and body stats
  - [ ] Plan shows: meal names, approximate portions, estimated calories and macros (protein/carbs/fat)
  - [ ] Plan updates if new Apple Health data is uploaded (e.g., big calorie burn → higher intake recommendation)

- As a user who has already logged food, I want to see what I should eat next based on what I've had.
  - [ ] Shows a chronological list of food logged today with AI-identified names and calorie estimates
  - [ ] Below the log: AI recommendation for remaining meals to hit daily targets
  - [ ] Running total of calories and macros shown (today's log vs. daily target)

### Epic 5: Injury & Body Condition Tab

- As a user, I want to view and update my body stats so that AI recommendations stay accurate over time.
  - [ ] Displays all stats from onboarding (height, weight, body fat %, muscle mass, lifting weights, goal, target)
  - [ ] Edit button opens an update form — user can change any field
  - [ ] Saved changes immediately affect future AI recommendations

- As a user, I want to see my full injury and condition history so I can track patterns.
  - [ ] Shows chronological list of all injury/condition entries logged via Quick Log
  - [ ] Each entry shows: date, description, which tab it was routed to
  - [ ] Active (recent/unresolved) injuries are visually distinguished from older entries

### Epic 6: Quick Log (universal input)

- As a user, I want one place to log anything — food, injuries, workout data — so I don't have to think about where to put it.
  - [ ] Text input is always visible and accessible from the Quick Log tab
  - [ ] Camera / photo upload option for food photos
  - [ ] File upload option for Apple Health screenshots (post-workout)
  - [ ] AI auto-categorizes the entry (food → Nutrition, injury/condition → Injury tab, Apple Health screenshot → all tabs)

- As a user, I want confirmation that my log was understood and routed correctly.
  - [ ] After submission: categorization badge appears (e.g., "Logged to 饮食")
  - [ ] Completion animation plays on successful submission
  - [ ] AI text response appears below (e.g., "Got it — banana added to today's nutrition. You're at 650 calories so far.")

- As a user uploading a food photo, I want to confirm what AI identified before it's saved.
  - [ ] After photo upload: AI shows identification result + estimated calories (e.g., "Banana — ~89 calories. Confirm?")
  - [ ] User can confirm or cancel before entry is saved
  - [ ] If cancelled, nothing is recorded

- As a user uploading an Apple Health screenshot, I want it to automatically update all three tabs.
  - [ ] AI reads workout data from screenshot (duration, heart rate, calories burned, etc.)
  - [ ] All three tabs update based on new data: training plan refreshes, nutrition target adjusts, body stats log updates if body data is visible
  - [ ] Quick Log shows a summary of what was read and updated

---

## What We're Building

Everything below must work end-to-end at the demo:

1. **User auth** — signup + login, all data tied to account, persists across sessions
2. **Onboarding flow** — step-by-step guided setup collecting body stats, goals, and targets; generates first training plan
3. **Training Plan tab** — detailed next workout (exercises/sets/reps/weight), dynamic frequency note, injury warnings, swappable and directly editable exercises
4. **Nutrition tab** — two states: empty → full day meal plan; logged → running total + recommendations for rest of day
5. **Injury tab** — body stats profile with edit button, injury/condition history from Quick Log
6. **Quick Log** — universal input for text, food photos, and Apple Health screenshots; auto-categorization; confirmation step for food photos; animated feedback + AI response after every submission
7. **Cross-tab intelligence** — injury logs automatically surface warnings in the Training Plan tab; Apple Health upload refreshes all three tabs

---

## What We'd Add With More Time

- **Long-term trend charts** — body weight, strength, body fat % over weeks/months (the data will be in the database; just needs a visualization layer)
- **AI-driven injury pattern analysis** — once enough data exists, surface correlations between specific exercises and reported discomfort
- **Direct Apple Health / HealthKit API integration** — replace screenshot upload with live data sync; descoped because HealthKit setup is complex
- **Data export** — download your logs as CSV or PDF; useful for sharing with a real coach
- **Progress photos** — upload periodic body photos; AI tracks visual changes over time

---

## Non-Goals

- **Sleep monitoring** — complex to integrate meaningfully; Apple Watch sleep data is noisy; cut entirely for v1
- **Restaurant recommendations** — requires location APIs and restaurant databases; not the focus
- **Social features, sharing, gamification** — this is a personal tool, not a social platform
- **Real machine learning model training** — pattern recognition is handled by Claude's reasoning on logged data, not a trained model
- **Mobile native app** — web app only; no React Native or App Store submission

---

## Open Questions

- **Auth provider choice** — Supabase Auth vs. a simpler option? Needs to be decided before /spec. *(Needs answer before /spec)*
- **Apple Health screenshot format** — what does a typical Apple Health export screenshot look like? Should we test a few examples to calibrate Claude's vision prompt? *(Can wait until /build, but worth having a sample screenshot ready)*
- **Nutrition macro targets** — where do the daily calorie/macro targets come from? Calculated from onboarding data (TDEE formula), hardcoded defaults, or AI-generated? *(Needs answer before /spec)*
- **Plan reset cadence** — does the training plan reset daily, or does it persist until the user uploads new Apple Health data? *(Needs answer before /spec)*
