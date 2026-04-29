export async function callClaude(action, payload) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  })
  if (!res.ok) throw new Error(`Claude proxy error: ${res.status}`)
  return res.json()
}
