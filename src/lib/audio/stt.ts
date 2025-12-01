export async function transcribeBlob(audioBlob: Blob, languageCode: string) {
  const base = import.meta.env.VITE_AUDIO_API_BASE || import.meta.env.VITE_AUDIO_API_BASE_LOCAL
  if (!base) throw new Error('Audio API base not configured')
  const model = import.meta.env.VITE_STT_MODEL
  if (!model) throw new Error('STT model not configured')
  const form = new FormData()
  form.append('file', audioBlob, 'audio.wav')
  form.append('model', model)
  form.append('language', languageCode || 'en')
  const res = await fetch(`${base}/transcribe`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('Transcription request failed')
  const data = await res.json()
  return data.text as string
}
