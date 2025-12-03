export async function transcribeBlob(audioBlob: Blob, languageCode: string) {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error('Groq API key not configured')
  }

  const form = new FormData()
  form.append('file', audioBlob, 'audio.wav')
  form.append('model', 'whisper-large-v3')
  form.append('language', languageCode || 'en')
  form.append('response_format', 'json')
  form.append('temperature', '0')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
    },
    body: form
  })

  if (!res.ok) throw new Error('Transcription failed')

  const data = await res.json()
  return data.text
}
