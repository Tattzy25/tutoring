export async function postLog(endpoint: string, message: string) {
  try {
    await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: Date.now(), message }) })
  } catch {}
}
