import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true, // Since this is a client-side app
})

export async function transcribeBlob(audioBlob: Blob, languageCode: string) {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error('Groq API key not configured')
  }

  // Convert Blob to File for Groq SDK
  const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' })

  const transcription = await groq.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-large-v3',
    language: languageCode || 'en',
    response_format: 'json',
    temperature: 0.0,
  })

  return transcription.text
}
