import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

function langInstruction(language) {
  if (language === 'zh') {
    return '\n\nIMPORTANT: Respond entirely in Chinese (Simplified). Translate all human-readable text and exercise names (e.g. "卧推", "深蹲", "硬拉"). Keep all JSON key names in English exactly as specified in the schema above — only translate string values.'
  }
  return ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, payload } = req.body

  try {
    let result
    switch (action) {
      case 'generate_onboarding_plan': {
        const p = payload
        const goalLabel =
          p.goal === 'weight_loss' ? 'Weight Loss' :
          p.goal === 'muscle_gain' ? 'Muscle Gain' : 'General Fitness'

        const lifts = [
          p.bench_kg ? `Bench Press: ${p.bench_kg}kg` : null,
          p.squat_kg ? `Squat: ${p.squat_kg}kg` : null,
          p.deadlift_kg ? `Deadlift: ${p.deadlift_kg}kg` : null,
        ].filter(Boolean)

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: `You are a certified personal trainer. Generate a personalized single-day training plan based on the user's profile.

Return ONLY valid JSON in this exact format, no explanation or markdown:
{
  "plan": [
    { "exercise": "string", "sets": number, "reps": number, "weight_kg": number }
  ],
  "assessment": "string"
}

Rules:
- Include 5–8 exercises appropriate for the goal
- Use realistic weights based on their lift data; default conservatively if no data provided
- Weight Loss: prioritize compound movements + higher rep ranges (10–15), shorter rest
- Muscle Gain: prioritize heavy compound movements (4–6 sets, 6–10 reps) + isolation work
- CRITICAL: Do not include exercises that conflict with any stated injuries or conditions
- assessment: 2–3 sentences — brief analysis of their profile and what today's session targets${langInstruction(p.language)}`,
          messages: [{
            role: 'user',
            content: `User Profile:
Height: ${p.height_cm}cm | Weight: ${p.weight_kg}kg
Body Fat: ${p.body_fat_pct}% | Muscle Mass: ${p.muscle_mass_kg}kg
Goal: ${goalLabel}
Target: ${p.target}
Current Condition: ${p.current_condition}
${lifts.length > 0 ? `Lifts: ${lifts.join(', ')}` : 'Lifting experience: not provided'}
Daily Targets: ${p.daily_calories}kcal | ${p.daily_protein_g}g protein | ${p.daily_carbs_g}g carbs | ${p.daily_fat_g}g fat`
          }]
        })

        const text = message.content[0].text.trim()
        const jsonStart = text.indexOf('{')
        const jsonEnd = text.lastIndexOf('}')
        result = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
        break
      }

      case 'generate_training_plan': {
        const p = payload
        const workoutType = p.workout_type || 'push'
        const goalLabel =
          p.profile.goal === 'weight_loss' ? 'Weight Loss' :
          p.profile.goal === 'muscle_gain' ? 'Muscle Gain' : 'General Fitness'
        const lifts = [
          p.profile.bench_kg ? `Bench Press: ${p.profile.bench_kg}kg` : null,
          p.profile.squat_kg ? `Squat: ${p.profile.squat_kg}kg` : null,
          p.profile.deadlift_kg ? `Deadlift: ${p.profile.deadlift_kg}kg` : null,
        ].filter(Boolean)
        const injuryList = (p.injuries || []).map(i => i.description).join('; ')
        const recentWorkouts = (p.recent_workouts || [])
          .slice(-10)
          .map(w => `- ${w.raw_input} (${new Date(w.logged_at).toLocaleDateString()})`)
          .join('\n')

        const workoutGuides = {
          push: `PUSH DAY — Chest, Shoulders, Triceps
Order: chest compounds → chest isolation → shoulder compounds → shoulder isolation → triceps
Reference exercises: Bench Press (Chest), Incline Dumbbell Press (Chest), Cable Fly (Chest),
  Shoulder Press (Shoulders), Lateral Raise (Shoulders), Front Raise (Shoulders),
  Tricep Pushdown (Triceps), Overhead Tricep Extension (Triceps), Dips (Triceps)
Rep ranges: 6-10 for compounds, 12-15 for isolation`,
          pull: `PULL DAY — Back, Biceps, Rear Delts
Order: back width → back thickness → rear delts → biceps
Reference exercises: Pull-Up or Lat Pulldown (Back), Barbell Row (Back), Seated Cable Row (Back),
  Face Pull (Rear Delts), Dumbbell Shrug (Traps),
  Barbell Curl (Biceps), Hammer Curl (Biceps), Cable Curl (Biceps)
Rep ranges: 6-10 for compounds, 12-15 for isolation`,
          legs: `LEG DAY — Quads, Hamstrings, Glutes, Calves
Order: quad dominant → hamstring dominant → glute isolation → calves
Reference exercises: Barbell Squat (Quads), Leg Press (Quads), Leg Extension (Quads),
  Romanian Deadlift (Hamstrings), Leg Curl (Hamstrings),
  Hip Thrust (Glutes), Bulgarian Split Squat (Glutes/Quads),
  Calf Raise (Calves)
Rep ranges: 5-10 for compounds, 10-15 for isolation, 15-20 for calves`,
          arms: `ARMS DAY — Biceps, Triceps
Alternate biceps and triceps exercises to allow recovery between sets
Reference exercises: Barbell Curl (Biceps), Incline Dumbbell Curl (Biceps), Hammer Curl (Biceps), Cable Curl (Biceps),
  Skull Crusher (Triceps), Close-Grip Bench (Triceps), Tricep Pushdown (Triceps), Overhead Extension (Triceps)
Rep ranges: 8-12 for strength sets, 12-15 for pump sets`,
          full_body: `FULL BODY — Hit all major muscle groups in one session
Order: lower body compound → upper push → upper pull → auxiliary
Reference exercises: Squat or Deadlift (Quads/Hamstrings), Bench Press (Chest), Barbell Row (Back),
  Shoulder Press (Shoulders), Lat Pulldown (Back), Lunge (Quads),
  Dumbbell Curl (Biceps), Tricep Pushdown (Triceps)
Rep ranges: 5-8 for main compounds, 10-12 for accessories`,
        }

        const focusLabels = {
          push: 'Push — Chest, Shoulders & Triceps',
          pull: 'Pull — Back & Biceps',
          legs: 'Legs — Quads, Hamstrings & Glutes',
          arms: 'Arms — Biceps & Triceps',
          full_body: 'Full Body',
        }

        const genPlanMsg = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1536,
          system: `You are an expert personal trainer following structured bodybuilding splits. Generate a ${workoutType.toUpperCase()} day session.

Program reference for this session type:
${workoutGuides[workoutType] || workoutGuides.full_body}

Return ONLY valid JSON, no markdown or explanation:
{
  "workout_type": "${workoutType}",
  "workout_focus": "${focusLabels[workoutType] || 'Full Body'}",
  "exercises": [
    { "exercise": "string", "sets": number, "reps": number, "weight_kg": number, "muscle_group": "string" }
  ],
  "frequency_note": "string"
}

Rules:
- Include 6-8 exercises. Follow the order specified in the program reference above.
- muscle_group: the specific muscle targeted (e.g. "Chest", "Biceps", "Quads") — not a body region
- Group same-muscle exercises together (all Chest before all Shoulders, etc.)
- Calibrate weights to their lifts; default conservatively if no data
- Muscle Gain: heavier loads, lower reps for compounds. Weight Loss: moderate load, higher reps.
- NEVER include exercises conflicting with active injuries
- frequency_note: 1-2 sentences on their recent training pattern and what today targets${langInstruction(p.language)}`,
          messages: [{
            role: 'user',
            content: `Goal: ${goalLabel} | Weight: ${p.profile.weight_kg}kg | Height: ${p.profile.height_cm}cm
${lifts.length > 0 ? `Lifts: ${lifts.join(', ')}` : 'Lifting data: not provided'}
Daily targets: ${p.profile.daily_calories}kcal / ${p.profile.daily_protein_g}g protein

Active injuries: ${injuryList || 'None'}

Recent 14-day workout history:
${recentWorkouts || 'No workout logs yet'}`
          }]
        })

        const genPlanText = genPlanMsg.content[0].text.trim()
        const gps = genPlanText.indexOf('{')
        const gpe = genPlanText.lastIndexOf('}')
        result = JSON.parse(genPlanText.slice(gps, gpe + 1))
        break
      }

      case 'analyze_frequency': {
        const p = payload
        const logs = (p.workout_logs || [])
          .map(w => `- ${w.raw_input} (${new Date(w.logged_at).toLocaleDateString()})`)
          .join('\n')

        const freqMsg = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 256,
          system: `You are a personal trainer reviewing a client's recent workout frequency.

Return ONLY valid JSON:
{ "note": "string" }

Rules:
- note: 1-2 sentences. Specific and grounded in the actual logs — reference patterns you see (muscle groups hit, rest days, volume trends). If no logs exist, encourage the user to start logging workouts.
- Never give vague generic advice.${langInstruction(p.language)}`,
          messages: [{
            role: 'user',
            content: `Workout logs from the last 14 days:\n${logs || 'No workout logs recorded yet.'}`
          }]
        })

        const freqText = freqMsg.content[0].text.trim()
        const fps = freqText.indexOf('{')
        const fpe = freqText.lastIndexOf('}')
        result = JSON.parse(freqText.slice(fps, fpe + 1))
        break
      }

      case 'generate_meal_plan': {
        const p = payload
        const goalLabel =
          p.profile?.goal === 'weight_loss' ? 'Weight Loss' :
          p.profile?.goal === 'muscle_gain' ? 'Muscle Gain' : 'General Fitness'

        const mealMsg = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: `You are a nutrition coach. Create a full-day meal plan matching the user's macro targets.

Return ONLY valid JSON, no markdown. Every string value must be a single line with no literal newlines:
{
  "meals": [
    { "name": "Breakfast", "foods": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number },
    { "name": "Lunch", "foods": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number },
    { "name": "Dinner", "foods": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number },
    { "name": "Snack", "foods": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }
  ]
}

Rules:
- Include 3-4 meals. Each "foods" value is a single comma-separated line listing foods with portions.
- Keep total daily macros close to targets
- Make it practical — foods people can actually find and prepare${langInstruction(p.language)}`,
          messages: [{
            role: 'user',
            content: `Goal: ${goalLabel} | Weight: ${p.profile?.weight_kg ?? '?'}kg
Daily targets: ${p.profile?.daily_calories}kcal | ${p.profile?.daily_protein_g}g protein | ${p.profile?.daily_carbs_g}g carbs | ${p.profile?.daily_fat_g}g fat`
          }]
        })

        const mealText = mealMsg.content[0].text.trim()
        const ms = mealText.indexOf('{')
        const me = mealText.lastIndexOf('}')
        result = JSON.parse(mealText.slice(ms, me + 1))
        break
      }

      case 'recommend_remaining_meals': {
        const p = payload
        const goalLabel =
          p.profile?.goal === 'weight_loss' ? 'Weight Loss' :
          p.profile?.goal === 'muscle_gain' ? 'Muscle Gain' : 'General Fitness'

        const remMsg = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          system: `You are a nutrition coach. The user has logged what they've eaten today. Tell them what to eat for the rest of the day to hit their targets.

Return ONLY valid JSON, no markdown:
{
  "recommendation": "string"
}

Rules:
- recommendation: 2-4 sentences. Be specific — suggest actual meals or foods with rough portions
- Factor in how much of each macro is still needed
- If they're already at or over a macro, acknowledge that
- Keep advice practical and encouraging${langInstruction(p.language)}`,
          messages: [{
            role: 'user',
            content: `Goal: ${goalLabel}
Daily targets: ${p.targets?.calories}kcal / ${p.targets?.protein}g protein / ${p.targets?.carbs}g carbs / ${p.targets?.fat}g fat
Already eaten today: ${p.eaten?.calories}kcal / ${p.eaten?.protein}g protein / ${p.eaten?.carbs}g carbs / ${p.eaten?.fat}g fat`
          }]
        })

        const remText = remMsg.content[0].text.trim()
        const rs = remText.indexOf('{')
        const re = remText.lastIndexOf('}')
        result = JSON.parse(remText.slice(rs, re + 1))
        break
      }

      case 'process_quick_log': {
        const p = payload
        const mode = p.mode || 'text'

        const userContent = []

        if ((mode === 'food_photo' || mode === 'apple_health') && p.image_data) {
          userContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: p.image_media_type || 'image/jpeg',
              data: p.image_data,
            },
          })
        }

        const profileContext = p.profile
          ? `\nUser profile: Goal=${p.profile.goal} | Weight=${p.profile.weight_kg}kg | Daily targets: ${p.profile.daily_calories}kcal / ${p.profile.daily_protein_g}g protein / ${p.profile.daily_carbs_g}g carbs / ${p.profile.daily_fat_g}g fat`
          : ''

        const injuryContext = (p.active_injuries?.length)
          ? `\nUser's current active injuries: ${JSON.stringify(p.active_injuries)}`
          : ''

        const textBody =
          mode === 'food_photo'
            ? `Identify the food in this photo and estimate macros.${profileContext}`
            : mode === 'apple_health'
            ? `Extract all workout data from this Apple Health screenshot.${profileContext}`
            : `User quick log entry: "${p.raw_input}"${profileContext}${injuryContext}`

        userContent.push({ type: 'text', text: textBody })

        const systemPrompt =
          mode === 'apple_health'
            ? `You are a health data extractor. Extract workout metrics from an Apple Health screenshot.

Return ONLY valid JSON, no markdown or explanation:
{
  "categories": ["apple_health"],
  "apple_health": {
    "workout_duration_min": number or null,
    "calories_burned": number or null,
    "heart_rate_avg": number or null,
    "heart_rate_max": number or null,
    "training_load": number or null,
    "workout_type": string or null
  },
  "ai_response": string
}

Rules:
- Set any field to null if not visible in the screenshot
- Never crash on partial data — always return valid JSON
- ai_response: summarize what was logged and how it affects today's training and nutrition${langInstruction(p.language)}`
            : `You are a health coach assistant. Analyze this quick log entry and categorize it.

Categories:
- "food": any food, drink, or meal consumed — estimate macros realistically
- "injury": any pain, soreness, injury, body condition concern, OR recovery/resolution of a previous condition
- "workout": exercise or training described in text (not from Apple Health)
- "other": anything that doesn't fit the above

Return ONLY valid JSON, no markdown or explanation:
{
  "categories": ["food" | "injury" | "workout" | "other"],
  "food"?: { "description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number },
  "injury"?: { "description": string, "is_active": boolean },
  "resolves"?: ["injury-id-1", "injury-id-2"],
  "workout"?: { "description": string },
  "ai_response": string
}

Rules:
1. One entry can belong to MULTIPLE categories — detect ALL that apply
2. "injury" is_active: true = new or ongoing issue. is_active: false = user is reporting recovery or resolution.
3. "resolves": if the user's active injuries list is provided and this log resolves one or more of them (semantically — same body part, same condition, or the user says they feel better), include their IDs here. Use your judgment: "肩膀好多了" resolves a shoulder injury even if phrased differently. "感觉好多了" with only one active injury should resolve it. Leave this field out if nothing is resolved.
4. ai_response must be specific and personalized. For a recovery, confirm the resolution warmly and note any return-to-training advice.
5. For food photos: return just the "food" category with realistic macro estimates based on what you see${langInstruction(p.language)}`

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
        })

        const rawText = message.content[0].text.trim()
        const jsonStart = rawText.indexOf('{')
        const jsonEnd = rawText.lastIndexOf('}')
        result = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1))
        break
      }

      case 'swap_exercise': {
        const p = payload
        const planText = (p.current_plan || [])
          .map((e, i) => `${i + 1}. ${e.exercise}: ${e.sets}×${e.reps} @ ${e.weight_kg}kg`)
          .join('\n')

        const swapMsg = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: `You are a personal trainer adjusting a client's workout plan. Apply the requested modification and return the full updated plan.

Return ONLY valid JSON, no markdown:
{
  "exercises": [
    { "exercise": "string", "sets": number, "reps": number, "weight_kg": number, "muscle_group": "string" }
  ]
}

Rules:
- Return the complete exercises array with the change applied. Keep all other exercises unchanged.
- Preserve the muscle_group value for unchanged exercises.
- Assign an appropriate muscle_group to the replacement exercise.
- Replacement should target similar muscle groups unless the user asks otherwise.
- Use realistic weights for the replacement based on the weights already in the plan.${langInstruction(p.language)}`,
          messages: [{
            role: 'user',
            content: `Current plan:\n${planText}\n\nRequest: "${p.request}"`
          }]
        })

        const swapText = swapMsg.content[0].text.trim()
        const sps = swapText.indexOf('{')
        const spe = swapText.lastIndexOf('}')
        result = JSON.parse(swapText.slice(sps, spe + 1))
        break
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` })
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error('Claude proxy error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
