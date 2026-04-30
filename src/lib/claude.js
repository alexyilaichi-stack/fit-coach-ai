export async function callClaude(action, payload, language = 'en') {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload: { ...payload, language } }),
  })
  if (!res.ok) throw new Error(`Claude proxy error: ${res.status}`)
  return res.json()
}
