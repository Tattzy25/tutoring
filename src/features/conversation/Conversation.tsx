import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import type { RefObject } from 'react'

interface ConversationProps {
  messages: { role: 'user' | 'tutor'; content: string }[]
  input: string
  setInput: (v: string) => void
  onSend: (text: string) => void
  isRecording: boolean
  onToggleMic: () => void
  isSending: boolean
  scrollAreaRef: RefObject<HTMLDivElement | null>
}

export default function Conversation({ messages, input, setInput, onSend, isRecording, onToggleMic, isSending, scrollAreaRef }: ConversationProps) {
  return (
    <Card className="flex-1">
      <CardHeader>Conversation</CardHeader>
      <CardContent className="flex flex-col h-[60vh]">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          {messages.map((msg, index) => (
            <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block p-2 rounded-lg ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {msg.content}
              </span>
            </div>
          ))}
        </ScrollArea>
        <div className="flex mt-4">
          <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Type your message..." className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(input) } }} />
          <Button onClick={() => onSend(input)} className="ml-2" aria-label="Send message" disabled={isSending || !input.trim()}>Send</Button>
          <Button onClick={onToggleMic} variant="outline" className="ml-2" aria-label="Toggle microphone" disabled={isSending}>
            {isRecording ? 'Stop' : 'Mic'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
