import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SettingsPanelProps {
  apiProvider: 'openai' | 'groq'
  setApiProvider: (v: 'openai' | 'groq') => void
  language: string
  setLanguage: (v: string) => void
  languages: { value: string; label: string; code?: string }[]
  mode: 'casual' | 'structured'
  setMode: (v: 'casual' | 'structured') => void
  openaiModel: string
  setOpenaiModel: (v: string) => void
  groqModel: string
  setGroqModel: (v: string) => void
  systemPrompt: string
  setSystemPrompt: (v: string) => void
  errorMsg: string | null
  logs?: string[]
}

export default function SettingsPanel({ apiProvider, setApiProvider, language, setLanguage, languages, mode, setMode, openaiModel, setOpenaiModel, groqModel, setGroqModel, systemPrompt, setSystemPrompt, errorMsg, logs }: SettingsPanelProps) {
  const base = import.meta.env.VITE_AUDIO_API_BASE || import.meta.env.VITE_AUDIO_API_BASE_LOCAL
  const [health, setHealth] = useState<string[]>([])

  const checkHealth = async () => {
    const results: string[] = []
    if (!base) { setHealth(['audio_base:not_configured']); return }
    try { const r = await fetch(`${base}/voices`); results.push(`voices:${r.status}`) } catch { results.push('voices:error') }
    try { const r = await fetch(`${base}/languages`); results.push(`languages:${r.status}`) } catch { results.push('languages:error') }
    setHealth(results)
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>Provider & Model</CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
                    <Select value={apiProvider} onValueChange={(v) => setApiProvider(v as typeof apiProvider)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select provider" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="groq">Groq</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
          <div className="space-y-2">
            <Label>OpenAI Model</Label>
            <Input value={openaiModel} onChange={e => setOpenaiModel(e.target.value)} placeholder="gpt-4o-mini" />
          </div>
          <div className="space-y-2">
            <Label>Groq Model</Label>
            <Input value={groqModel} onChange={e => setGroqModel(e.target.value)} placeholder="openai/gpt-oss-120b" />
          </div>
                  
        </CardContent>
      </Card>

      <Card>
        <CardHeader>Language & Mode</CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select language" /></SelectTrigger>
              <SelectContent>
                {languages.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="mode">Structured Mode</Label>
            <Switch id="mode" checked={mode === 'structured'} onCheckedChange={c => setMode(c ? 'structured' : 'casual')} />
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>System Prompt</CardHeader>
        <CardContent>
          <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="Tutor system prompt" className="min-h-32" />
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>Health & Logs</CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button onClick={checkHealth}>Check Audio API</Button>
            <span className="text-sm">{base}</span>
          </div>
          <ScrollArea className="h-24 border rounded-md p-2 text-sm">
            {health.map((h, i) => (<div key={i}>{h}</div>))}
            {errorMsg ? (<div className="text-destructive">{errorMsg}</div>) : null}
            {Array.isArray(logs) ? logs.slice(-10).map((l, i) => (<div key={`log-${i}`}>{l}</div>)) : null}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
