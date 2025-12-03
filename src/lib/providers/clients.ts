export const aiBase = import.meta.env.VITE_AI_API_BASE

export async function aiPost<T>(path: string, body: unknown): Promise<T> {
  if (!aiBase) throw new Error('AI API base not configured')
  const res = await fetch(`${aiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`)
  return res.json() as Promise<T>
}
