import { useState, useEffect, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import HeaderBar from '@/features/header/HeaderBar'
import SettingsPanel from '@/features/settings/SettingsPanel'
import Conversation from '@/features/conversation/Conversation'
import FeedbackPanel from '@/features/feedback/FeedbackPanel'
import GoalsPanel from '@/features/goals/GoalsPanel'
import ProgressPanel from '@/features/progress/ProgressPanel'
import JournalPanel from '@/features/journal/JournalPanel'
import { useLocalStorageState } from '@/lib/storage'
import { playTTS } from '@/lib/audio/tts'
import { transcribeBlob } from '@/lib/audio/stt'
import { generateResponse as generateResponseAPI, analyzeFeedback as analyzeFeedbackAPI, detectProficiency as detectProficiencyAPI, suggestGoals as suggestGoalsAPI } from '@/lib/providers/chat'
import type { Message, JournalEntry } from '@/lib/types'
import { matchLanguage } from '@/lib/i18n'

// removed browser injection fallback

export default function LanguageTutor() {
  const [language, setLanguage] = useLocalStorageState('language', '')
  const [mode, setMode] = useLocalStorageState<'casual' | 'structured'>('mode', 'casual')
  const [messages, setMessages] = useLocalStorageState<Message[]>('messages', [])
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useLocalStorageState<string[]>('feedback', [])
  const [goals, setGoals] = useLocalStorageState<string[]>('goals', ['Master basic greetings', 'Learn numbers 1-100'])
  const [editingGoalIndex, setEditingGoalIndex] = useState<number | null>(null)
  const [editingGoalText, setEditingGoalText] = useState<string>('')
  const [progress, setProgress] = useLocalStorageState<{ vocabulary: number; grammar: number; duration: number }>('progress', { vocabulary: 20, grammar: 30, duration: 0 })
  const [progressHistory, setProgressHistory] = useLocalStorageState<{ t: number; vocabulary: number; grammar: number; duration: number }[]>('progressHistory', [])
  const [journal, setJournal] = useLocalStorageState<JournalEntry[]>('journal', [])
  const [proficiency, setProficiency] = useLocalStorageState('proficiency', 'beginner')
  const [isRecording, setIsRecording] = useState(false)
  const [isTTSOn, setIsTTSOn] = useState(true)
  const [apiProvider, setApiProvider] = useLocalStorageState<'openai' | 'groq' | 'claude'>('apiProvider', 'openai')
  const [ttsVoice, setTtsVoice] = useLocalStorageState('ttsVoice', import.meta.env.VITE_TTS_DEFAULT_VOICE || '')
  const [voices, setVoices] = useState<string[]>([])
  const [openaiModel, setOpenaiModel] = useLocalStorageState('openaiModel', import.meta.env.VITE_OPENAI_MODEL || '')
  const [groqModel, setGroqModel] = useLocalStorageState('groqModel', import.meta.env.VITE_GROQ_MODEL || '')
  const [claudeModel, setClaudeModel] = useLocalStorageState('claudeModel', import.meta.env.VITE_ANTHROPIC_MODEL || '')
  const [systemPrompt, setSystemPrompt] = useLocalStorageState('systemPrompt', import.meta.env.VITE_SYSTEM_PROMPT || '')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const recordingMimeTypeRef = useRef<string>('audio/webm')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [commonErrors, setCommonErrors] = useState<Record<string, number>>({})
  const [isSending, setIsSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('goals')
  const sessionStartRef = useRef<number>(Date.now())
  const lastErrorCountRef = useRef<number>(0)
  const [logs, setLogs] = useState<string[]>([])
  const lastMessageTsRef = useRef<number>(0)
  const sentCountRef = useRef<number>(0)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const [languages, setLanguages] = useState<{ value: string; label: string; code?: string }[]>([])

  useEffect(() => {
    const base = import.meta.env.VITE_AUDIO_API_BASE || import.meta.env.VITE_AUDIO_API_BASE_LOCAL
    if (!base) { setErrorMsg('Audio API base not configured'); setLogs(prev => [...prev, `[${new Date().toISOString()}] audio_base:not_configured`]); return }
    ;(async () => {
      try {
        const res = await fetch(`${base}/voices`)
        if (res.ok) {
          const data: string[] = await res.json()
          setVoices(data)
          if (!ttsVoice && data.length) setTtsVoice(data[0])
        } else {
          setLogs(prev => [...prev, `[${new Date().toISOString()}] voices:${res.status}`])
        }
      } catch { setLogs(prev => [...prev, `[${new Date().toISOString()}] voices:error`]) }
    })()
    ;(async () => {
      const envList = (import.meta.env.VITE_LANGUAGES || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      if (envList.length) {
        setLanguages(envList.map((v: string) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })))
        return
      }
      try {
        const res = await fetch(`${base}/languages`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && typeof data[0] === 'string') {
            setLanguages((data as string[]).map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })))
          } else if (Array.isArray(data)) {
            setLanguages((data as { name?: string; value?: string; code?: string }[]).map((item) => {
              const name = (item.name || item.value || '') as string
              return { value: name, label: name.charAt(0).toUpperCase() + name.slice(1), code: item.code }
            }))
          }
        } else {
          setLogs(prev => [...prev, `[${new Date().toISOString()}] languages:${res.status}`])
        }
      } catch { setLogs(prev => [...prev, `[${new Date().toISOString()}] languages:error`]) }
    })()
  }, [setTtsVoice, ttsVoice])

  useEffect(() => {
    if (!languages.length) return
    if (!language || !languages.find(l => l.value === language)) {
      const matched = matchLanguage(languages)
      if (matched) setLanguage(matched)
    }
  }, [languages])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferred = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      recordingMimeTypeRef.current = preferred
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: preferred })
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }
      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch {
      setErrorMsg('Microphone access denied or unavailable')
      setLogs(prev => [...prev, `[${new Date().toISOString()}] mic:error`])
    }
  }

  const stopRecording = async () => {
    try {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      mediaRecorderRef.current?.addEventListener('stop', async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeTypeRef.current })
          audioChunksRef.current = []
          const selectedLang = languages.find(l => l.value === language)
          const code = selectedLang?.code || 'en'
          const text = await transcribeBlob(audioBlob as Blob, code)
          setInput(text)
          await sendMessage(text)
        } catch {
          setErrorMsg('Transcription failed')
          setLogs(prev => [...prev, `[${new Date().toISOString()}] stt:error`])
        }
      })
    } catch {
      setErrorMsg('Stop recording failed')
      setLogs(prev => [...prev, `[${new Date().toISOString()}] recording_stop:error`])
    }
  }

  const sendMessage = async (text: string) => {
    if (!text || isSending) return
    const now = Date.now()
    if (now - lastMessageTsRef.current < 1500) { setLogs(prev => [...prev, `[${new Date().toISOString()}] rate_limit:send`]); return }
    lastMessageTsRef.current = now
    setIsSending(true)
    setErrorMsg(null)
    try {
      const newMessages: Message[] = [...messages, { role: 'user', content: text }]
      setMessages(newMessages)
      const response = await generateResponseLocal(newMessages)
      const updatedMessages: Message[] = [...newMessages, { role: 'tutor', content: response }]
      setMessages(updatedMessages)
      if (isTTSOn) { try { await playTTS(response, ttsVoice) } catch { setLogs(prev => [...prev, `[${new Date().toISOString()}] tts:error`]) } }
      const newFeedback = await analyzeFeedbackLocal(text)
      setFeedback([...feedback, newFeedback])
      updateProgress(text)
      await updateGoalsAsync([...newMessages, { role: 'tutor', content: response }])
      detectProficiencyLocal(updatedMessages)
      const vocabDelta = computeVocabularyDelta(text)
      const grammarDelta = computeGrammarDelta()
      if (vocabDelta >= 5 || grammarDelta >= 3) {
        setJournal([...journal, { date: new Date().toISOString(), summary: `Progress update: vocab +${vocabDelta}, grammar +${grammarDelta} in ${language}` }])
      }
    } catch {
      setErrorMsg('Message send failed')
      setLogs(prev => [...prev, `[${new Date().toISOString()}] msg_send:error`])
    } finally {
      setIsSending(false)
      setInput('')
      sentCountRef.current += 1
      const endpoint = import.meta.env.VITE_METRICS_ENDPOINT || ''
      const payload = { t: Date.now(), sent: sentCountRef.current }
      if (endpoint) { try { await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }) } catch {} }
    }
  }

  const generateResponseLocal = async (msgs: Message[]) => {
    return generateResponseAPI(msgs, language, mode, apiProvider, { openai: openaiModel, groq: groqModel, claude: claudeModel }, systemPrompt)
  }

  const analyzeFeedbackLocal = async (text: string) => {
    const raw = await analyzeFeedbackAPI(text, language, apiProvider, { openai: openaiModel, groq: groqModel, claude: claudeModel })
    try {
      const parsed = JSON.parse(raw)
      const comments: string[] = Array.isArray(parsed.comments) ? parsed.comments : []
      const errors: { type?: string; note?: string }[] = Array.isArray(parsed.errors) ? parsed.errors : []
      if (errors.length) {
        setCommonErrors(prev => {
          const next = { ...prev }
          for (const e of errors) {
            const key = (e.type || 'general').toLowerCase()
            next[key] = (next[key] || 0) + 1
          }
          return next
        })
        lastErrorCountRef.current = errors.length
      } else {
        lastErrorCountRef.current = 0
      }
      return comments.join(' ')
    } catch {
      lastErrorCountRef.current = 0
      return raw
    }
  }

  // playTTS imported

  const detectProficiencyLocal = async (msgs: Message[]) => {
    const level = await detectProficiencyAPI(msgs, language, apiProvider, { openai: openaiModel, groq: groqModel, claude: claudeModel })
    setProficiency(level)
  }

  const updateGoalsAsync = async (msgs: Message[]) => {
    const list = await suggestGoalsAPI(msgs, language, apiProvider, { openai: openaiModel, groq: groqModel, claude: claudeModel })
    if (Array.isArray(list) && list.length) {
      setGoals(list)
    }
  }

  const computeVocabularyDelta = (text: string) => {
    const tokens = text.toLowerCase().split(/[^a-zA-Záéíóúñü]+/).filter(w => w.length > 3)
    const unique = Array.from(new Set(tokens)).length
    return Math.min(unique, 10)
  }

  const computeGrammarDelta = () => {
    const errors = lastErrorCountRef.current
    const delta = Math.max(0, 5 - errors)
    return delta
  }

  const updateProgress = (text: string) => {
    const vocabDelta = computeVocabularyDelta(text)
    const grammarDelta = computeGrammarDelta()
    const durationMinutes = Math.floor((Date.now() - sessionStartRef.current) / 60000)
    setProgress(prev => ({
      vocabulary: Math.min(prev.vocabulary + vocabDelta, 100),
      grammar: Math.min(prev.grammar + grammarDelta, 100),
      duration: durationMinutes,
    }))
    setProgressHistory(prev => {
      const next = {
        t: Date.now(),
        vocabulary: Math.min((prev[prev.length - 1]?.vocabulary ?? progress.vocabulary) + vocabDelta, 100),
        grammar: Math.min((prev[prev.length - 1]?.grammar ?? progress.grammar) + grammarDelta, 100),
        duration: durationMinutes,
      }
      return [...prev, next]
    })
  }

  const addGoal = (newGoal: string) => {
    setGoals([...goals, newGoal])
  }

  const startEditGoal = (index: number) => {
    setEditingGoalIndex(index)
    setEditingGoalText(goals[index])
  }

  const saveGoal = () => {
    if (editingGoalIndex === null) return
    const next = [...goals]
    next[editingGoalIndex] = editingGoalText
    setGoals(next)
    setEditingGoalIndex(null)
    setEditingGoalText('')
  }

  const deleteGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index))
  }

  // For journal, add on session end or something

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <HeaderBar isTTSOn={isTTSOn} setIsTTSOn={setIsTTSOn} proficiency={proficiency} ttsVoice={ttsVoice} setTtsVoice={setTtsVoice} voices={voices} openSettings={() => setActiveTab('settings')} />
      <main className="flex-1 p-4 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 max-w-7xl mx-auto w-full">
        <Conversation messages={messages} input={input} setInput={setInput} onSend={sendMessage} isRecording={isRecording} onToggleMic={isRecording ? stopRecording : startRecording} isSending={isSending} scrollAreaRef={scrollAreaRef} />
        <FeedbackPanel feedback={feedback} commonErrors={commonErrors} />
      </main>
      <footer className="p-4 border-t">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-7xl mx-auto">
          <TabsList>
            <TabsTrigger value="goals">Learning Goals</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="goals">
            <GoalsPanel goals={goals} editingGoalIndex={editingGoalIndex} editingGoalText={editingGoalText} startEditGoal={startEditGoal} setEditingGoalText={setEditingGoalText} saveGoal={saveGoal} deleteGoal={deleteGoal} addGoal={addGoal} />
          </TabsContent>
          <TabsContent value="progress">
            <ProgressPanel progress={progress} history={progressHistory} />
          </TabsContent>
          <TabsContent value="journal">
            <JournalPanel journal={journal} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsPanel apiProvider={apiProvider as 'openai' | 'groq' | 'claude'} setApiProvider={v => setApiProvider(v)} language={language} setLanguage={setLanguage} languages={languages} mode={mode} setMode={setMode} openaiModel={openaiModel} setOpenaiModel={setOpenaiModel} groqModel={groqModel} setGroqModel={setGroqModel} claudeModel={claudeModel} setClaudeModel={setClaudeModel} systemPrompt={systemPrompt} setSystemPrompt={setSystemPrompt} errorMsg={errorMsg} logs={logs} />
          </TabsContent>
        </Tabs>
      </footer>
    </div>
  )
}
