async function claude(system, userContent, { max_tokens = 1024 } = {}) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens,
      system,
      messages: [{ role: 'user', content: Array.isArray(userContent) ? userContent : [{ type: 'text', text: userContent }] }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content[0].text.trim()
}

function parseJSON(text) {
  const s = text.indexOf('{'), e = text.lastIndexOf('}')
  return JSON.parse(text.slice(s, e + 1))
}

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
        const goalLabel = p.goal === 'weight_loss' ? 'Weight Loss' : p.goal === 'muscle_gain' ? 'Muscle Gain' : 'General Fitness'
        const lifts = [p.bench_kg && `Bench Press: ${p.bench_kg}kg`, p.squat_kg && `Squat: ${p.squat_kg}kg`, p.deadlift_kg && `Deadlift: ${p.deadlift_kg}kg`].filter(Boolean)
        const text = await claude(
          `You are a certified personal trainer. Generate a personalized single-day training plan.
Return ONLY valid JSON, no markdown:
{ "plan": [{ "exercise": "string", "sets": number, "reps": number, "weight_kg": number }], "assessment": "string" }
Rules: 5-8 exercises, realistic weights, no exercises conflicting with injuries. assessment: 2-3 sentences.${langInstruction(p.language)}`,
          `Height: ${p.height_cm}cm | Weight: ${p.weight_kg}kg | BF: ${p.body_fat_pct}% | Muscle: ${p.muscle_mass_kg}kg\nGoal: ${goalLabel} | Target: ${p.target}\nCondition: ${p.current_condition}\n${lifts.length ? `Lifts: ${lifts.join(', ')}` : 'No lift data'}\nDaily targets: ${p.daily_calories}kcal / ${p.daily_protein_g}g P / ${p.daily_carbs_g}g C / ${p.daily_fat_g}g F`
        )
        result = parseJSON(text)
        break
      }

      case 'generate_training_plan': {
        const p = payload
        const wt = p.workout_type || 'push'
        const goalLabel = p.profile.goal === 'weight_loss' ? 'Weight Loss' : p.profile.goal === 'muscle_gain' ? 'Muscle Gain' : 'General Fitness'
        const lifts = [p.profile.bench_kg && `Bench: ${p.profile.bench_kg}kg`, p.profile.squat_kg && `Squat: ${p.profile.squat_kg}kg`, p.profile.deadlift_kg && `Deadlift: ${p.profile.deadlift_kg}kg`].filter(Boolean)
        const injuryList = (p.injuries || []).map(i => i.description).join('; ')
        const recentWorkouts = (p.recent_workouts || []).slice(-10).map(w => `- ${w.raw_input} (${new Date(w.logged_at).toLocaleDateString()})`).join('\n')
        const guides = {
          push: 'PUSH: Chest→Shoulders→Triceps. Bench Press, Incline DB Press, Cable Fly, Shoulder Press, Lateral Raise, Tricep Pushdown, Overhead Extension. 6-10 compounds, 12-15 isolation.',
          pull: 'PULL: Back→Rear Delts→Biceps. Lat Pulldown, Barbell Row, Seated Cable Row, Face Pull, Barbell Curl, Hammer Curl. 6-10 compounds, 12-15 isolation.',
          legs: 'LEGS: Quads→Hamstrings→Glutes→Calves. Squat, Leg Press, Leg Extension, RDL, Leg Curl, Hip Thrust, Calf Raise. 5-10 compounds, 10-20 isolation.',
          arms: 'ARMS: Alternate biceps/triceps. Barbell Curl, Hammer Curl, Cable Curl, Skull Crusher, Tricep Pushdown, Overhead Extension. 8-15 reps.',
          full_body: 'FULL BODY: Lower compound→Upper push→Upper pull→Auxiliary. Squat/Deadlift, Bench, Row, Shoulder Press, Lat Pulldown, Curl, Pushdown. 5-12 reps.',
        }
        const focusLabels = { push: 'Push — Chest, Shoulders & Triceps', pull: 'Pull — Back & Biceps', legs: 'Legs — Quads, Hamstrings & Glutes', arms: 'Arms — Biceps & Triceps', full_body: 'Full Body' }
        const text = await claude(
          `You are an expert personal trainer. Generate a ${wt.toUpperCase()} day session.
${guides[wt] || guides.full_body}
Return ONLY valid JSON, no markdown:
{ "workout_type": "${wt}", "workout_focus": "${focusLabels[wt] || 'Full Body'}", "exercises": [{ "exercise": "string", "sets": number, "reps": number, "weight_kg": number, "muscle_group": "string" }], "frequency_note": "string" }
Rules: 6-8 exercises, group same muscle together, calibrate weights to lifts, NEVER include exercises conflicting with injuries.${langInstruction(p.language)}`,
          `Goal: ${goalLabel} | Weight: ${p.profile.weight_kg}kg\n${lifts.length ? `Lifts: ${lifts.join(', ')}` : 'No lift data'}\nActive injuries: ${injuryList || 'None'}\nRecent workouts:\n${recentWorkouts || 'None'}`,
          { max_tokens: 1536 }
        )
        result = parseJSON(text)
        break
      }

      case 'analyze_frequency': {
        const p = payload
        const logs = (p.workout_logs || []).map(w => `- ${w.raw_input} (${new Date(w.logged_at).toLocaleDateString()})`).join('\n')
        const text = await claude(
          `You are a personal trainer reviewing workout frequency. Return ONLY valid JSON: { "note": "string" }
note: 1-2 specific sentences referencing actual patterns in the logs. If no logs, encourage starting.${langInstruction(p.language)}`,
          `Workout logs last 14 days:\n${logs || 'No logs yet.'}`,
          { max_tokens: 256 }
        )
        result = parseJSON(text)
        break
      }

      case 'generate_meal_plan': {
        const p = payload
        const goalLabel = p.profile?.goal === 'weight_loss' ? 'Weight Loss' : p.profile?.goal === 'muscle_gain' ? 'Muscle Gain' : 'General Fitness'
        const text = await claude(
          `You are a nutrition coach. Create a full-day meal plan.
Return ONLY valid JSON, no markdown. All string values must be single lines with no literal newlines:
{ "meals": [{ "name": "Breakfast", "foods": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }, { "name": "Lunch", "foods": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }, { "name": "Dinner", "foods": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }, { "name": "Snack", "foods": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }] }
Each "foods" is a single comma-separated line. Keep totals close to targets.${langInstruction(p.language)}`,
          `Goal: ${goalLabel} | Weight: ${p.profile?.weight_kg ?? '?'}kg\nTargets: ${p.profile?.daily_calories}kcal / ${p.profile?.daily_protein_g}g P / ${p.profile?.daily_carbs_g}g C / ${p.profile?.daily_fat_g}g F`
        )
        result = parseJSON(text)
        break
      }

      case 'recommend_remaining_meals': {
        const p = payload
        const goalLabel = p.profile?.goal === 'weight_loss' ? 'Weight Loss' : p.profile?.goal === 'muscle_gain' ? 'Muscle Gain' : 'General Fitness'
        const text = await claude(
          `You are a nutrition coach. Tell the user what to eat for the rest of the day.
Return ONLY valid JSON: { "recommendation": "string" }
recommendation: 2-4 specific sentences with actual food suggestions and portions.${langInstruction(p.language)}`,
          `Goal: ${goalLabel}\nTargets: ${p.targets?.calories}kcal / ${p.targets?.protein}g P / ${p.targets?.carbs}g C / ${p.targets?.fat}g F\nEaten today: ${p.eaten?.calories}kcal / ${p.eaten?.protein}g P / ${p.eaten?.carbs}g C / ${p.eaten?.fat}g F`,
          { max_tokens: 512 }
        )
        result = parseJSON(text)
        break
      }

      case 'process_quick_log': {
        const p = payload
        const mode = p.mode || 'text'
        const profileContext = p.profile ? `\nUser: Goal=${p.profile.goal} | Weight=${p.profile.weight_kg}kg | Targets: ${p.profile.daily_calories}kcal / ${p.profile.daily_protein_g}g P` : ''
        const injuryContext = p.active_injuries?.length ? `\nActive injuries: ${JSON.stringify(p.active_injuries)}` : ''

        const userContent = []
        if ((mode === 'food_photo' || mode === 'apple_health') && p.image_data) {
          userContent.push({ type: 'image', source: { type: 'base64', media_type: p.image_media_type || 'image/jpeg', data: p.image_data } })
        }
        const textBody = mode === 'food_photo'
          ? `Identify the food in this photo and estimate macros.${profileContext}`
          : mode === 'apple_health'
          ? `Extract all workout data from this Apple Health screenshot.${profileContext}`
          : `User log: "${p.raw_input}"${profileContext}${injuryContext}`
        userContent.push({ type: 'text', text: textBody })

        const systemPrompt = mode === 'apple_health'
          ? `You are a health data extractor. Extract workout metrics from an Apple Health screenshot.
Return ONLY valid JSON: { "categories": ["apple_health"], "apple_health": { "workout_duration_min": number|null, "calories_burned": number|null, "heart_rate_avg": number|null, "heart_rate_max": number|null, "training_load": number|null, "workout_type": string|null }, "ai_response": string }
Set missing fields to null. ai_response: summarize what was logged.${langInstruction(p.language)}`
          : `You are a health coach. Analyze this log entry.
Categories: "food" (any meal/drink), "injury" (pain, soreness, OR recovery from a condition), "workout" (exercise), "other"
Return ONLY valid JSON: { "categories": [...], "food"?: { "description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "confidence": "high"|"medium"|"low" }, "injury"?: { "description": string, "is_active": boolean }, "resolves"?: ["id1"], "workout"?: { "description": string }, "ai_response": string }
Rules:
1. Detect ALL categories that apply
2. injury is_active: true=new/ongoing, false=recovery/resolved
3. resolves: include IDs from the active injuries list that this log semantically resolves (same body part, user says better, etc). Omit if nothing resolved.
4. food.confidence: "high" if specific quantities given, "medium" if reasonable estimate, "low" if very vague
5. ai_response: specific and personalized, never just "Logged."${langInstruction(p.language)}`

        const rawText = await claude(systemPrompt, userContent)
        result = parseJSON(rawText)
        break
      }

      case 'swap_exercise': {
        const p = payload
        const planText = (p.current_plan || []).map((e, i) => `${i + 1}. ${e.exercise}: ${e.sets}×${e.reps} @ ${e.weight_kg}kg`).join('\n')
        const text = await claude(
          `You are a personal trainer adjusting a workout plan.
Return ONLY valid JSON: { "exercises": [{ "exercise": "string", "sets": number, "reps": number, "weight_kg": number, "muscle_group": "string" }] }
Return the complete array with the change applied. Keep all other exercises unchanged.${langInstruction(p.language)}`,
          `Plan:\n${planText}\n\nRequest: "${p.request}"`
        )
        result = parseJSON(text)
        break
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` })
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error('Claude proxy error:', err)
    return res.status(500).json({ error: 'Internal server error', detail: err?.message, type: err?.constructor?.name })
  }
}
