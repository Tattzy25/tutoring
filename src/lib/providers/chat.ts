import { anthropic, groq, openai } from './clients'
import type { ApiProvider, Mode } from '@/lib/types'

export async function generateResponse(
  msgs: { role: 'user' | 'tutor'; content: string }[],
  _language: string,
  _mode: Mode,
  apiProvider: ApiProvider,
  modelConfig?: { openai?: string; groq?: string; claude?: string },
  systemPromptOverride?: string
) {
  const systemPrompt = systemPromptOverride || ''
  const chatMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = []
  if (systemPrompt) chatMessages.push({ role: 'system', content: systemPrompt })
  chatMessages.push(
    ...msgs.map(m => (
      { role: m.role === 'tutor' ? 'assistant' : 'user', content: m.content } as { role: 'user' | 'assistant'; content: string }
    ))
  )
  if (apiProvider === 'openai') {
    if (!modelConfig?.openai) throw new Error('Model not configured: openai')
    const completion = await openai.chat.completions.create({
      model: modelConfig.openai,
      messages: chatMessages,
    })
    return completion.choices[0].message.content || ''
  }
  if (apiProvider === 'groq') {
    if (!modelConfig?.groq) throw new Error('Model not configured: groq')
    const completion = await groq.chat.completions.create({
      model: modelConfig.groq,
      messages: chatMessages,
    })
    return completion.choices[0].message.content || ''
  }
  if (!modelConfig?.claude) throw new Error('Model not configured: claude')
  const anthropicMaxTokens = Number((import.meta as any).env?.VITE_ANTHROPIC_MAX_TOKENS || 512)
  const completion = await anthropic.messages.create({
    model: modelConfig.claude,
    max_tokens: anthropicMaxTokens,
    system: systemPrompt,
    messages: msgs.map(m => ({ role: m.role === 'tutor' ? 'assistant' : 'user', content: m.content })),
  })
  return (completion.content[0] as { text: string }).text
}

export async function analyzeFeedback(text: string, language: string, apiProvider: ApiProvider, modelConfig?: { openai?: string; groq?: string; claude?: string }) {
  const system = `Return only valid JSON: {"comments":["..."],"errors":[{"type":"...","note":"..."}]}. Analyze grammar, vocabulary, and syntax for ${language}. No extra text.`
  if (apiProvider === 'openai') {
    if (!modelConfig?.openai) throw new Error('Model not configured: openai')
    const completion = await openai.chat.completions.create({
      model: modelConfig.openai,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    })
    return completion.choices[0].message.content || ''
  }
  if (apiProvider === 'groq') {
    if (!modelConfig?.groq) throw new Error('Model not configured: groq')
    const completion = await groq.chat.completions.create({
      model: modelConfig.groq,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    })
    return completion.choices[0].message.content || ''
  }
  if (!modelConfig?.claude) throw new Error('Model not configured: claude')
  const anthropicMaxTokens = Number((import.meta as any).env?.VITE_ANTHROPIC_MAX_TOKENS || 512)
  const completion = await anthropic.messages.create({
    model: modelConfig.claude,
    max_tokens: anthropicMaxTokens,
    system,
    messages: [{ role: 'user', content: text }],
  })
  return (completion.content[0] as { text: string }).text
}

export async function detectProficiency(msgs: { role: 'user' | 'tutor'; content: string }[], language: string, apiProvider: ApiProvider, modelConfig?: { openai?: string; groq?: string; claude?: string }) {
  let level = 'beginner'
  const prompt = `Return only valid JSON: {"level":"beginner|intermediate|advanced"}. Determine level from these ${language} user messages: ${msgs.filter(m => m.role === 'user').map(m => m.content).join('; ')}`
  if (apiProvider === 'openai') {
    if (!modelConfig?.openai) throw new Error('Model not configured: openai')
    const completion = await openai.chat.completions.create({
      model: modelConfig.openai,
      messages: [{ role: 'system', content: 'You are a proficiency detector.' }, { role: 'user', content: prompt }],
    })
    try { level = JSON.parse(completion.choices[0].message.content || '{}').level?.toLowerCase() || 'beginner' } catch { level = 'beginner' }
  } else if (apiProvider === 'groq') {
    if (!modelConfig?.groq) throw new Error('Model not configured: groq')
    const completion = await groq.chat.completions.create({
      model: modelConfig.groq,
      messages: [{ role: 'system', content: 'You are a proficiency detector.' }, { role: 'user', content: prompt }],
    })
    try { level = JSON.parse(completion.choices[0].message.content || '{}').level?.toLowerCase() || 'beginner' } catch { level = 'beginner' }
  } else {
    if (!modelConfig?.claude) throw new Error('Model not configured: claude')
    const anthropicMaxTokens = Number((import.meta as any).env?.VITE_ANTHROPIC_MAX_TOKENS || 512)
    const completion = await anthropic.messages.create({
      model: modelConfig.claude,
      max_tokens: anthropicMaxTokens,
      system: 'You are a proficiency detector.',
      messages: [{ role: 'user', content: prompt }],
    })
    try { level = JSON.parse((completion.content[0] as { text: string }).text || '{}').level?.toLowerCase() || 'beginner' } catch { level = 'beginner' }
  }
  return level
}

export async function suggestGoals(
  msgs: { role: 'user' | 'tutor'; content: string }[],
  language: string,
  apiProvider: ApiProvider,
  modelConfig?: { openai?: string; groq?: string; claude?: string }
) {
  const system = `Return only valid JSON: {"goals":["..."]}. Suggest 3 concise learning goals tailored to the user's recent messages in ${language}.`
  const user = msgs.filter(m => m.role === 'user').map(m => m.content).join('\n')
  if (apiProvider === 'openai') {
    if (!modelConfig?.openai) throw new Error('Model not configured: openai')
    const completion = await openai.chat.completions.create({
      model: modelConfig.openai,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })
    try {
      const parsed = JSON.parse(completion.choices[0].message.content || '{}') as { goals?: string[] }
      return Array.isArray(parsed.goals) ? parsed.goals : []
    } catch {
      return []
    }
  }
  if (apiProvider === 'groq') {
    if (!modelConfig?.groq) throw new Error('Model not configured: groq')
    const completion = await groq.chat.completions.create({
      model: modelConfig.groq,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })
    try {
      const parsed = JSON.parse(completion.choices[0].message.content || '{}') as { goals?: string[] }
      return Array.isArray(parsed.goals) ? parsed.goals : []
    } catch {
      return []
    }
  }
  if (!modelConfig?.claude) throw new Error('Model not configured: claude')
  const anthropicMaxTokens = Number((import.meta as any).env?.VITE_ANTHROPIC_MAX_TOKENS || 512)
  const completion = await anthropic.messages.create({
    model: modelConfig.claude,
    max_tokens: anthropicMaxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
  try {
    const content = (completion.content[0] as { text: string }).text
    const parsed = JSON.parse(content || '{}') as { goals?: string[] }
    return Array.isArray(parsed.goals) ? parsed.goals : []
  } catch {
    return []
  }
}
