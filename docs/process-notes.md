# Process Notes

## /build

### Step 6: Quick Log tab — text, photo, screenshot + Claude categorization

**What was built:**
- `api/claude.js` — replaced `process_quick_log` stub with a real Claude prompt. Two system prompts: one for text/food_photo (detects all categories, returns structured data per category + ai_response), one for apple_health (extracts workout metrics from screenshot). Uses base64 for vision calls (more reliable than URL). Extracts JSON defensively.
- `src/components/LogFeedback.jsx` — categorization badge (food/injury/workout/apple_health with distinct colors), fade-in animation via requestAnimationFrame, AI response text below.
- `src/components/PhotoConfirm.jsx` — modal showing food preview image, AI-identified name, and 4-macro breakdown. Confirm/cancel buttons.
- `src/tabs/QuickLogTab.jsx` — full implementation: text area + submit, food photo upload (camera/file → Storage → Claude vision → PhotoConfirm modal → save), Apple Health upload (vision → save to quick_logs). On cancel photo: deletes from Supabase Storage. On confirm: saves to food_logs + quick_logs. Text submissions write to all relevant tables based on detected categories. Navigation to /app/nutrition (food) or /app/training (other) after 1.8s delay.
- Prerequisite: "food-photos" public Supabase Storage bucket created by user.
- Verification passed: text food log saved to food_logs + quick_logs. Injury log saved with is_active=true. Food photo showed PhotoConfirm modal before saving. Navigation to destination tab works (tabs are placeholders — built in Steps 7–9).

### Step 5: Onboarding wizard + TDEE calculation + initial plan generation

**What was built:**
- `OnboardingPage.jsx` — full 5-step wizard with progress indicator, field validation, and submit flow. Steps: Body Stats → Lifting Weights → Goal (radio) → Target (textarea) → Condition (textarea).
- `api/claude.js` — replaced the `generate_onboarding_plan` stub with a real Claude prompt. Sends user profile (stats, lifts, goal, target, condition, TDEE targets) and returns `{ plan: [...], assessment: "..." }`. Uses `claude-sonnet-4-6`. JSON is extracted defensively with `indexOf`/`lastIndexOf` to handle any leading/trailing whitespace.
- Submission flow: calculates TDEE via existing `lib/tdee.js`, calls Claude proxy, upserts `user_profiles` (with `onboarding_complete: true`), upserts `training_plans` for today, navigates to `/app/training`.
- Project has no git repo yet (step 11); commit skipped.
- Verification passed: `user_profiles` row exists (height 184cm, weight 78kg, body fat 16%). `training_plans` row exists for 2026-04-29 with real Claude-generated exercises (e.g. Scapular Pull, 4×10) and frequency_note. App navigated to `/app/training` successfully.
