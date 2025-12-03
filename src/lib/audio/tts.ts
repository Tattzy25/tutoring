import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
})

export async function playTTS(text: string, voice: string): Promise<HTMLAudioElement> {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error('Groq API key not configured')
  }

  const response = await groq.audio.speech.create({
    model: 'playai-tts',
    voice: voice,
    input: text,
    response_format: 'wav',
  })

  const arrayBuffer = await response.arrayBuffer()
  const blob = new Blob([arrayBuffer], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  return audio
}
