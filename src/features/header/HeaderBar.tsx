import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface HeaderBarProps {
  isTTSOn: boolean
  setIsTTSOn: (v: boolean) => void
  proficiency: string
  ttsVoice: string
  setTtsVoice: (v: string) => void
  voices: string[]
  openSettings: () => void
}

import { Button } from '@/components/ui/button'
export default function HeaderBar({ isTTSOn, setIsTTSOn, proficiency, ttsVoice, setTtsVoice, voices, openSettings }: HeaderBarProps) {
  return (
    <header className="p-4 border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <h1 className="text-2xl font-bold">Language Learning Tutor</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="tts">TTS</Label>
            <Switch id="tts" checked={isTTSOn} onCheckedChange={setIsTTSOn} />
          </div>
          {voices.length > 0 && (
          <Select value={ttsVoice} onValueChange={setTtsVoice}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select voice" />
            </SelectTrigger>
            <SelectContent>
              {voices.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
          <Badge variant={proficiency === 'beginner' ? 'secondary' : proficiency === 'intermediate' ? 'default' : 'destructive'}>{proficiency}</Badge>
          <Button variant="outline" onClick={openSettings}>Settings</Button>
        </div>
      </div>
    </header>
  )
}
