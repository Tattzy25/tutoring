import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface FeedbackPanelProps {
  feedback: string[]
  commonErrors: Record<string, number>
}

export default function FeedbackPanel({ feedback, commonErrors }: FeedbackPanelProps) {
  return (
    <Card className="w\full md:w-1/3">
      <CardHeader>Feedback</CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh]" role="status" aria-live="polite">
          {feedback.map((fb, index) => (
            <p key={index} className="mb-2">{fb}</p>
          ))}
        </ScrollArea>
        <div className="mt-4">
          <Label>Common Errors</Label>
          <div className="mt-2 space-y-1">
            {Object.keys(commonErrors).length === 0 ? (
              <span className="text-sm text-muted-foreground">None yet</span>
            ) : (
              Object.entries(commonErrors)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{key}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
