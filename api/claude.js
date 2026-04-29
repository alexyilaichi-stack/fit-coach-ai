import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, payload } = req.body

  try {
    let result
    switch (action) {
      case 'generate_onboarding_plan':
        result = { mock: true, action, message: 'Mock onboarding plan response' }
        break
      case 'generate_training_plan':
        result = { mock: true, action, message: 'Mock training plan response' }
        break
      case 'analyze_frequency':
        result = { mock: true, action, message: 'Mock frequency analysis response' }
        break
      case 'generate_meal_plan':
        result = { mock: true, action, message: 'Mock meal plan response' }
        break
      case 'recommend_remaining_meals':
        result = { mock: true, action, message: 'Mock remaining meals response' }
        break
      case 'process_quick_log':
        result = { mock: true, action, message: 'Mock quick log response' }
        break
      case 'swap_exercise':
        result = { mock: true, action, message: 'Mock swap exercise response' }
        break
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` })
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error('Claude proxy error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
