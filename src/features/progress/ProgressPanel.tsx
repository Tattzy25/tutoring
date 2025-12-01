import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'

interface ProgressPanelProps {
  progress: { vocabulary: number; grammar: number; duration: number }
  history: { t: number; vocabulary: number; grammar: number; duration: number }[]
}

export default function ProgressPanel({ progress, history }: ProgressPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Vocabulary</Label>
        <Progress value={progress.vocabulary} />
      </div>
      <div>
        <Label>Grammar</Label>
        <Progress value={progress.grammar} />
      </div>
      <div>
        <Label>Conversation Duration</Label>
        <Progress value={progress.duration % 100} />
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history.map((p, i) => ({ index: i + 1, vocabulary: p.vocabulary, grammar: p.grammar }))}>
            <XAxis dataKey="index" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="vocabulary" stroke="#22c55e" dot={false} />
            <Line type="monotone" dataKey="grammar" stroke="#3b82f6" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
