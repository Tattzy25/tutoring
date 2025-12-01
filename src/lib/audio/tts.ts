export async function playTTS(text: string, voice: string) {
  const base = import.meta.env.VITE_AUDIO_API_BASE || import.meta.env.VITE_AUDIO_API_BASE_LOCAL || 'http://localhost:3001'
  const res = await fetch(`${base}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'playai-tts', voice, input: text, response_format: 'wav' }),
  })
  if (!res.ok) throw new Error('TTS request failed')
  const arrayBuffer = await res.arrayBuffer()
  const blob = new Blob([arrayBuffer], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.play()
}
