import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface HeaderBarProps {
  proficiency: string
  isDark: boolean
  toggleTheme: () => void
  openSettings: () => void
}

import { Button } from '@/components/ui/button'
export default function HeaderBar({ proficiency, isDark, toggleTheme, openSettings }: HeaderBarProps) {
  return (
    <header className="p-2 sm:p-4 border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <h1 className="text-2xl font-bold">Language Learning Tutor</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="theme">Dark</Label>
            <Switch id="theme" checked={isDark} onCheckedChange={toggleTheme} />
          </div>
          <Badge variant={proficiency === 'beginner' ? 'secondary' : proficiency === 'intermediate' ? 'default' : 'destructive'}>{proficiency}</Badge>
          <Button variant="outline" onClick={openSettings}>Settings</Button>
        </div>
      </div>
    </header>
  )
}
