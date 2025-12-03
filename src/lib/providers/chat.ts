import { aiPost } from './clients'
import type { ApiProvider, Mode } from '@/lib/types'

export async function generateResponse(
  msgs: { role: 'user' | 'tutor'; content: string }[],
  language: string,
  mode: Mode,
  apiProvider: ApiProvider,
  modelConfig?: { openai?: string; groq?: string },
  systemPromptOverride?: string
) {
  if (apiProvider !== 'openai' && apiProvider !== 'groq') throw new Error('Unsupported provider')
  if (apiProvider === 'openai' && !modelConfig?.openai) throw new Error('Model not configured: openai')
  if (apiProvider === 'groq' && !modelConfig?.groq) throw new Error('Model not configured: groq')
  const body = {
    provider: apiProvider,
    model: apiProvider === 'openai' ? modelConfig?.openai : modelConfig?.groq,
    system: systemPromptOverride || '',
    language,
    mode,
    messages: msgs,
  }
  const data = await aiPost<{ content: string }>('/chat', body)
  return data.content || ''
}

export async function analyzeFeedback(text: string, language: string, apiProvider: ApiProvider, modelConfig?: { openai?: string; groq?: string }) {
  if (apiProvider !== 'openai' && apiProvider !== 'groq') throw new Error('Unsupported provider')
  const system = `Return only valid JSON: {"comments":["..."],"errors":[{"type":"...","note":"..."}]}. Analyze grammar, vocabulary, and syntax for ${language}. No extra text.`
  const body = {
    provider: apiProvider,
    model: apiProvider === 'openai' ? modelConfig?.openai : modelConfig?.groq,
    system,
    text,
  }
  const data = await aiPost<{ content: string }>('/analyze', body)
  return data.content || ''
}

export async function detectProficiency(msgs: { role: 'user' | 'tutor'; content: string }[], language: string, apiProvider: ApiProvider, modelConfig?: { openai?: string; groq?: string }) {
  if (apiProvider !== 'openai' && apiProvider !== 'groq') throw new Error('Unsupported provider')
  const prompt = `Return only valid JSON: {"level":"beginner|intermediate|advanced"}. Determine level from these ${language} user messages: ${msgs.filter(m => m.role === 'user').map(m => m.content).join('; ')}`
  const body = {
    provider: apiProvider,
    model: apiProvider === 'openai' ? modelConfig?.openai : modelConfig?.groq,
    system: 'You are a proficiency detector.',
    prompt,
  }
  const data = await aiPost<{ level: string }>('/proficiency', body)
  return (data.level || 'beginner').toLowerCase()
}

export async function suggestGoals(
  msgs: { role: 'user' | 'tutor'; content: string }[],
  language: string,
  apiProvider: ApiProvider,
  modelConfig?: { openai?: string; groq?: string }
) {
  const system = `Return only valid JSON: {"goals":["..."]}. Suggest 3 concise learning goals tailored to the user's recent messages in ${language}.`
  const user = msgs.filter(m => m.role === 'user').map(m => m.content).join('\n')
  const body = {
    provider: apiProvider,
    model: apiProvider === 'openai' ? modelConfig?.openai : modelConfig?.groq,
    system,
    user,
  }
  const data = await aiPost<{ goals: string[] }>('/goals', body)
  return Array.isArray(data.goals) ? data.goals : []
}
