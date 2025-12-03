export async function playTTS(text: string, voice: string): Promise<HTMLAudioElement> {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error('Groq API key not configured')
  }

  const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'playai-tts',
      voice,
      input: text,
      response_format: 'wav'
    })
  })

  if (!res.ok) throw new Error('TTS failed')

  const arrayBuffer = await res.arrayBuffer()
  const blob = new Blob([arrayBuffer], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.volume = 1
  return audio
}
