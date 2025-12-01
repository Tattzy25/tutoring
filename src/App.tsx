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
import { generateResponse as generateResponseAPI, analyzeFeedback as analyzeFeedbackAPI, detectProficiency as detectProficiencyAPI } from '@/lib/providers/chat'
import type { Message, JournalEntry } from '@/lib/types'

// removed browser injection fallback

export default function LanguageTutor() {
  const [language, setLanguage] = useLocalStorageState('language', 'spanish')
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
  const [openaiModel, setOpenaiModel] = useLocalStorageState('openaiModel', 'gpt-4o-mini')
  const [groqModel, setGroqModel] = useLocalStorageState('groqModel', 'openai/gpt-oss-120b')
  const [claudeModel, setClaudeModel] = useLocalStorageState('claudeModel', 'claude-3-5-sonnet-latest')
  const [systemPrompt, setSystemPrompt] = useLocalStorageState('systemPrompt', 'You are a helpful language tutor. Respond concisely and clearly.')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const recordingMimeTypeRef = useRef<string>('audio/webm')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [commonErrors, setCommonErrors] = useState<Record<string, number>>({})
  const [isSending, setIsSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('goals')
  const languageCodes: Record<string, string> = {
    english: 'en',
    spanish: 'es',
    french: 'fr',
    german: 'de',
    japanese: 'ja',
    italian: 'it',
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const [languages, setLanguages] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    const base = import.meta.env.VITE_AUDIO_API_BASE || import.meta.env.VITE_AUDIO_API_BASE_LOCAL || 'http://localhost:3001'
    ;(async () => {
      try {
        const res = await fetch(`${base}/voices`)
        if (res.ok) {
          const data: string[] = await res.json()
          setVoices(data)
          if (!ttsVoice && data.length) setTtsVoice(data[0])
        }
      } catch { void 0 }
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
          const data: string[] = await res.json()
          setLanguages(data.map((v: string) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })))
        }
      } catch { void 0 }
    })()
  }, [setTtsVoice, ttsVoice])

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
          const text = await transcribeBlob(audioBlob as Blob, languageCodes[language] || 'en')
          setInput(text)
          await sendMessage(text)
        } catch {
          setErrorMsg('Transcription failed')
        }
      })
    } catch {
      setErrorMsg('Stop recording failed')
    }
  }

  const sendMessage = async (text: string) => {
    if (!text || isSending) return
    setIsSending(true)
    setErrorMsg(null)
    try {
      const newMessages: Message[] = [...messages, { role: 'user', content: text }]
      setMessages(newMessages)
      const response = await generateResponseLocal(newMessages)
      const updatedMessages: Message[] = [...newMessages, { role: 'tutor', content: response }]
      setMessages(updatedMessages)
      if (isTTSOn) await playTTS(response, ttsVoice)
      const newFeedback = await analyzeFeedbackLocal(text)
      setFeedback([...feedback, newFeedback])
      updateProgress()
      updateGoals()
      detectProficiencyLocal(updatedMessages)
      if (updatedMessages.length % 5 === 0) {
        setJournal([...journal, { date: new Date().toISOString(), summary: `Reached ${updatedMessages.length} messages in ${language}` }])
      }
    } catch {
      setErrorMsg('Message send failed')
    } finally {
      setIsSending(false)
      setInput('')
    }
  }

  const generateResponseLocal = async (msgs: Message[]) => {
    return generateResponseAPI(msgs, language, mode, apiProvider, { openai: openaiModel, groq: groqModel, claude: claudeModel }, systemPrompt)
  }

  const analyzeFeedbackLocal = async (text: string) => {
    const raw = await analyzeFeedbackAPI(text, language, apiProvider)
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
      }
      return comments.join(' ')
    } catch {
      return raw
    }
  }

  // playTTS imported

  const detectProficiencyLocal = async (msgs: Message[]) => {
    const level = await detectProficiencyAPI(msgs, language, apiProvider)
    setProficiency(level)
  }

  const updateGoals = () => {
    // Simple, can use API to generate
    setGoals(['Master irregular verbs', 'Expand vocabulary on food', 'Improve sentence structure'])
  }

  const updateProgress = () => {
    setProgress(prev => ({
      vocabulary: Math.min(prev.vocabulary + 5, 100),
      grammar: Math.min(prev.grammar + 3, 100),
      duration: prev.duration + 1,
    }))
    setProgressHistory(prev => {
      const next = {
        t: Date.now(),
        vocabulary: Math.min((prev[prev.length - 1]?.vocabulary ?? progress.vocabulary) + 5, 100),
        grammar: Math.min((prev[prev.length - 1]?.grammar ?? progress.grammar) + 3, 100),
        duration: (prev[prev.length - 1]?.duration ?? progress.duration) + 1,
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
            <SettingsPanel apiProvider={apiProvider as 'openai' | 'groq' | 'claude'} setApiProvider={v => setApiProvider(v)} language={language} setLanguage={setLanguage} languages={languages} mode={mode} setMode={setMode} openaiModel={openaiModel} setOpenaiModel={setOpenaiModel} groqModel={groqModel} setGroqModel={setGroqModel} claudeModel={claudeModel} setClaudeModel={setClaudeModel} systemPrompt={systemPrompt} setSystemPrompt={setSystemPrompt} errorMsg={errorMsg} />
          </TabsContent>
        </Tabs>
      </footer>
    </div>
  )
}
