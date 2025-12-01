import { anthropic, groq, openai } from './clients'
import type { ApiProvider, Mode } from '@/lib/types'

export async function generateResponse(
  msgs: { role: 'user' | 'tutor'; content: string }[],
  language: string,
  mode: Mode,
  apiProvider: ApiProvider,
  modelConfig?: { openai?: string; groq?: string; claude?: string },
  systemPromptOverride?: string
) {
  const systemPrompt = systemPromptOverride || `You are a helpful language tutor for ${language}. Respond in ${language} only. ${mode === 'structured' ? 'Provide structured lessons.' : 'Engage in casual conversation.'}`
  const chatMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...msgs.map(m => (
      { role: m.role === 'tutor' ? 'assistant' : 'user', content: m.content } as { role: 'user' | 'assistant'; content: string }
    )),
  ]
  if (apiProvider === 'openai') {
    const completion = await openai.chat.completions.create({
      model: modelConfig?.openai || 'gpt-4o-mini',
      messages: chatMessages,
    })
    return completion.choices[0].message.content || ''
  }
  if (apiProvider === 'groq') {
    const completion = await groq.chat.completions.create({
      model: modelConfig?.groq || 'openai/gpt-oss-120b',
      messages: chatMessages,
    })
    return completion.choices[0].message.content || ''
  }
  const completion = await anthropic.messages.create({
    model: modelConfig?.claude || 'claude-3-5-sonnet-latest',
    max_tokens: 500,
    system: systemPrompt,
    messages: msgs.map(m => ({ role: m.role === 'tutor' ? 'assistant' : 'user', content: m.content })),
  })
  return (completion.content[0] as { text: string }).text
}

export async function analyzeFeedback(text: string, language: string, apiProvider: ApiProvider) {
  const system = `Return JSON only: {"comments":["..."],"errors":[{"type":"...","note":"..."}]}. Analyze ${language} grammar, vocabulary, syntax. Gentle tone.`
  if (apiProvider === 'openai') {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    })
    return completion.choices[0].message.content || ''
  }
  if (apiProvider === 'groq') {
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    })
    return completion.choices[0].message.content || ''
  }
  const completion = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 500,
    system,
    messages: [{ role: 'user', content: text }],
  })
  return (completion.content[0] as { text: string }).text
}

export async function detectProficiency(msgs: { role: 'user' | 'tutor'; content: string }[], language: string, apiProvider: ApiProvider) {
  let level = 'beginner'
  const prompt = `Analyze these user messages in ${language} and determine proficiency level: beginner, intermediate, or advanced. Messages: ${msgs.filter(m => m.role === 'user').map(m => m.content).join('; ')}`
  if (apiProvider === 'openai') {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: 'You are a proficiency detector.' }, { role: 'user', content: prompt }],
    })
    level = completion.choices[0].message.content?.toLowerCase() || 'beginner'
  } else if (apiProvider === 'groq') {
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'system', content: 'You are a proficiency detector.' }, { role: 'user', content: prompt }],
    })
    level = completion.choices[0].message.content?.toLowerCase() || 'beginner'
  } else {
    const completion = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 50,
      system: 'You are a proficiency detector.',
      messages: [{ role: 'user', content: prompt }],
    })
    level = ((completion.content[0] as { text: string }).text || 'beginner').toLowerCase()
  }
  return level
}
