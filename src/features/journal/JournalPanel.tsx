import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface JournalPanelProps {
  journal: { date: string; summary: string }[]
}

export default function JournalPanel({ journal }: JournalPanelProps) {
  return (
    <Accordion type="single" collapsible>
      {journal.map((entry, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger>{entry.date}</AccordionTrigger>
          <AccordionContent>{entry.summary}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
