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
import { postLog } from '@/lib/logger'

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
  const [isTTSOn] = useState(true)
  const [apiProvider, setApiProvider] = useLocalStorageState<'openai' | 'groq'>('apiProvider', 'openai')
  const [ttsVoice] = useLocalStorageState('ttsVoice', import.meta.env.VITE_TTS_DEFAULT_VOICE || '')
  const [openaiModel, setOpenaiModel] = useLocalStorageState('openaiModel', import.meta.env.VITE_OPENAI_MODEL || '')
  const [groqModel, setGroqModel] = useLocalStorageState('groqModel', import.meta.env.VITE_GROQ_MODEL || '')
  const [theme, setTheme] = useLocalStorageState('theme', {
    background: '#000000',
    primary: '#ffffff',
    accent: '#ffff00',
    text: '#ffffff',
    borderRadius: '8px'
  })
  const [isDark, setIsDark] = useLocalStorageState('isDark', true)

  const lightTheme = {
    background: '#ffffff',
    primary: '#3b82f6',
    accent: '#f59e0b',
    text: '#000000',
    borderRadius: '8px'
  }

  const darkTheme = {
    background: '#000000',
    primary: '#ffffff',
    accent: '#ffff00',
    text: '#ffffff',
    borderRadius: '8px'
  }

  const toggleTheme = () => {
    setIsDark(!isDark)
    setTheme(isDark ? lightTheme : darkTheme)
  }
  
  const [systemPrompt, setSystemPrompt] = useLocalStorageState('systemPrompt', import.meta.env.VITE_SYSTEM_PROMPT || `You are a helpful language tutor. When responding to learners' questions or content, provide explanations and guidance that are concise, accurate, and easy to understand.

For each response:
- First, think step-by-step to understand the learner's main question and any possible confusion.
- Then, offer a brief, clear explanation or answer, using simple language appropriate for the learner's level.
- Use examples or analogies only when necessary for clarification.
- Avoid unnecessary details or overly technical language.
- If the learner makes a mistake, gently correct it and explain why.

Output Format:
- Replies should be short (1-3 sentences), in plain text, and directly address the learner's query or correction.
- If clarification is needed, ask a concise follow-up question.

Example 1
Input: What's the difference between "affect" and "effect"?
Output: "Affect" is usually a verb meaning to influence, while "effect" is usually a noun meaning the result of something. For example, "The weather can affect your mood," and "The weather has an effect on your mood."

Example 2
Input: He goed to school.
Output: The correct form is "He went to school." "Went" is the past tense of "go."`) 
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const recordingMimeTypeRef = useRef<string>('audio/webm')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
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
  const logEvent = async (message: string) => {
    const entry = `[${new Date().toISOString()}] ${message}`
    setLogs(prev => [...prev, entry])
    const endpoint = import.meta.env.VITE_LOG_ENDPOINT || ''
    if (endpoint) { try { await postLog(endpoint, entry) } catch {} }
  }

  useEffect(() => {
    // Set hardcoded languages with codes
    const hardcodedLanguages = [
      { value: 'english', label: 'English', code: 'en' },
      { value: 'spanish', label: 'Spanish', code: 'es' },
      { value: 'french', label: 'French', code: 'fr' },
      { value: 'german', label: 'German', code: 'de' },
    ]
    setLanguages(hardcodedLanguages)
  }, [])

  useEffect(() => {
    if (!languages.length) return
    if (!language || !languages.find(l => l.value === language)) {
      const matched = matchLanguage(languages)
      if (matched) setLanguage(matched)
    }
  }, [languages])

  useEffect(() => {
    document.documentElement.style.setProperty('--background', theme.background)
    document.documentElement.style.setProperty('--foreground', theme.text)
    document.documentElement.style.setProperty('--primary', theme.primary)
    document.documentElement.style.setProperty('--accent', theme.accent)
    document.documentElement.style.setProperty('--radius', theme.borderRadius)
  }, [theme])

  const startInterruptionMonitor = (onInterrupt: () => void) => {
    let monitoring = true
    let audioContext: AudioContext | null = null
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      if (!monitoring) return
      audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 256
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      const check = () => {
        if (!monitoring) {
          stream.getTracks().forEach(track => track.stop())
          audioContext?.close()
          return
        }
        analyser.getByteFrequencyData(dataArray)
        const volume = dataArray.reduce((a, b) => a + b) / bufferLength
        if (volume > 20) { // speech threshold
          onInterrupt()
          monitoring = false
          stream.getTracks().forEach(track => track.stop())
          audioContext?.close()
        } else {
          requestAnimationFrame(check)
        }
      }
      check()
    }).catch(() => {})
    return () => {
      monitoring = false
      audioContext?.close()
    }
  }

  const startRecording = async (onSilence?: () => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferred = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      recordingMimeTypeRef.current = preferred
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: preferred })
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }
      if (onSilence) {
        const audioContext = new AudioContext()
        const analyser = audioContext.createAnalyser()
        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)
        analyser.fftSize = 256
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        let silenceStart = Date.now()
        const checkSilence = () => {
          analyser.getByteFrequencyData(dataArray)
          const volume = dataArray.reduce((a, b) => a + b) / bufferLength
          if (volume < 10) { // silence threshold
            if (Date.now() - silenceStart > 2000) {
              onSilence()
              return
            }
          } else {
            silenceStart = Date.now()
          }
          requestAnimationFrame(checkSilence)
        }
        checkSilence()
      }
      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch {
      setErrorMsg('Microphone access denied or unavailable')
      await logEvent('mic:error')
    }
  }

  const stopRecording = async (manualStop = false) => {
    try {
      mediaRecorderRef.current?.stop()
      if (manualStop) setIsRecording(false)
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
          await logEvent('stt:error')
        }
      })
    } catch {
      setErrorMsg('Stop recording failed')
      await logEvent('recording_stop:error')
    }
  }

  const sendMessage = async (text: string) => {
    if (!text || isSending) return
    const now = Date.now()
    if (now - lastMessageTsRef.current < 1500) { await logEvent('rate_limit:send'); return }
    lastMessageTsRef.current = now
    setIsSending(true)
    setErrorMsg(null)
    try {
      const newMessages: Message[] = [...messages, { role: 'user', content: text }]
      setMessages(newMessages)
      const response = await generateResponseLocal(newMessages)
      const updatedMessages: Message[] = [...newMessages, { role: 'tutor', content: response }]
      setMessages(updatedMessages)
      if (isTTSOn) {
        try {
          const audio = await playTTS(response, ttsVoice)
          currentAudioRef.current = audio
          audio.play()
          const stopMonitor = startInterruptionMonitor(() => {
            audio.pause()
            currentAudioRef.current = null
            stopMonitor()
            startRecording(() => stopRecording(false))
          })
          audio.onended = () => {
            stopMonitor()
            if (isRecording) startRecording(() => stopRecording(false))
          }
        } catch {
          await logEvent('tts:error')
        }
      } else {
        // No TTS, restart recording immediately
        if (isRecording) startRecording(() => stopRecording(false))
      }
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
      await logEvent('msg_send:error')
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
    return generateResponseAPI(msgs, language, mode, apiProvider, { openai: openaiModel, groq: groqModel }, systemPrompt)
  }

  const analyzeFeedbackLocal = async (text: string) => {
    const raw = await analyzeFeedbackAPI(text, language, apiProvider, { openai: openaiModel, groq: groqModel })
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
    const level = await detectProficiencyAPI(msgs, language, apiProvider, { openai: openaiModel, groq: groqModel })
    setProficiency(level)
  }

  const updateGoalsAsync = async (msgs: Message[]) => {
    const list = await suggestGoalsAPI(msgs, language, apiProvider, { openai: openaiModel, groq: groqModel })
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
      <HeaderBar proficiency={proficiency} isDark={isDark} toggleTheme={toggleTheme} openSettings={() => setActiveTab('settings')} />
      <main className="flex-1 p-4 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 max-w-7xl mx-auto w-full">
        <Conversation messages={messages} input={input} setInput={setInput} onSend={sendMessage} isRecording={isRecording} onToggleMic={isRecording ? () => stopRecording(true) : () => startRecording(() => stopRecording(false))} isSending={isSending} scrollAreaRef={scrollAreaRef} />
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
            <SettingsPanel apiProvider={apiProvider as 'openai' | 'groq'} setApiProvider={v => setApiProvider(v)} language={language} setLanguage={setLanguage} languages={languages} mode={mode} setMode={setMode} openaiModel={openaiModel} setOpenaiModel={setOpenaiModel} groqModel={groqModel} setGroqModel={setGroqModel} systemPrompt={systemPrompt} setSystemPrompt={setSystemPrompt} errorMsg={errorMsg} logs={logs} theme={theme} setTheme={setTheme} />
          </TabsContent>
        </Tabs>
      </footer>
    </div>
  )
}
