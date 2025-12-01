export async function playTTS(text: string, voice: string) {
  const base = import.meta.env.VITE_AUDIO_API_BASE || import.meta.env.VITE_AUDIO_API_BASE_LOCAL
  if (!base) throw new Error('Audio API base not configured')
  const model = import.meta.env.VITE_TTS_MODEL
  const format = import.meta.env.VITE_TTS_FORMAT
  if (!model) throw new Error('TTS model not configured')
  if (!format) throw new Error('TTS format not configured')
  const res = await fetch(`${base}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, voice, input: text, response_format: format }),
  })
  if (!res.ok) throw new Error('TTS request failed')
  const arrayBuffer = await res.arrayBuffer()
  const blob = new Blob([arrayBuffer], { type: `audio/${format}` })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.play()
}
