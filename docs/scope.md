# FitCoach AI — Personal Training Intelligence

## Idea
An AI-powered health coach that replaces the "data but no advice" gap in fitness apps — you check in daily, log observations anytime, and it prescribes your training, corrective exercises, and nutrition based on your actual stats and current condition.

## Who It's For
Alex — and anyone who works out consistently but feels like their fitness apps are just silent reporters. People who want a coach that says "here's what you should do today" instead of "here's what you did yesterday." Gym-goers who track their workouts informally and want personalized, adaptive programming without hiring a personal trainer.

## Inspiration & References
- **Apple Watch / Apple Health** — great data collection, zero actionable output. The exact gap this app fills.
- **ChatGPT fitness prompts** — people already do this manually, typing their stats and asking for plans. This app makes that workflow structured and persistent.
- Core insight: Apple Health already has the data. The app reads it (via screenshot upload) and adds the intelligence layer on top.

## Goals
- Build something Alex would actually open every morning
- Demonstrate real AI + data skills in a portfolio piece
- Ship a working, polished product in 3-4 hours
- Show a recruiter that Alex understands how to build tools that solve real human problems, not just technical demos

## What "Done" Looks Like
A web app with two modes:

**Morning check-in:** Structured intake — user uploads an Apple Health screenshot (AI reads the data via vision) OR manually enters their stats (height, weight, body fat %, muscle mass, current lifting weights). Describes any issues (pain, imbalance, how they're feeling). App generates: a personalized training program for the day/week + corrective exercise recommendations + nutrition targets.

**Anytime logging:** Throughout the day, the user can log observations — "just ate X", "noticed my left shoulder hurts during bench", "feeling low energy." App records these and factors them into the next check-in's recommendations.

The output should feel like a prescription from a knowledgeable coach — specific exercises with sets/reps, specific nutrition guidance (especially for low appetite / muscle building goals), and a clear explanation of *why* these recommendations fit this person's current state.

## What's Explicitly Cut
- **Sleep monitoring** — complex to integrate meaningfully, cut entirely for v1
- **Restaurant recommendations** — requires location APIs and restaurant databases, cut; nutritionist advice stays
- **Direct Apple Health API / HealthKit integration** — too complex for a hackathon; replaced with screenshot upload + AI vision (clever and achievable)
- **Social features, sharing, gamification** — out of scope
- **Long-term trend analysis** — v1 focuses on today's recommendations, not multi-month charting

## Loose Implementation Notes
- **Frontend:** Web app (React or plain HTML/CSS) — simple check-in form + log feed
- **AI layer:** Claude API — vision for reading Apple Health screenshots, reasoning for generating training/nutrition recommendations
- **Data:** No database needed for v1 — session state or localStorage for the daily log; user inputs their stats fresh each session or on first use
- **Key screens:** (1) Onboarding / stats setup, (2) Morning check-in + screenshot upload, (3) Generated plan output, (4) Anytime log entry
- **Differentiator to emphasize:** Not a tracker. Not a chat. A coach — structured check-in, always-open log, prescriptive output.
