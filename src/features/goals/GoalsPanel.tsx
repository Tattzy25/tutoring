import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface GoalsPanelProps {
  goals: string[]
  editingGoalIndex: number | null
  editingGoalText: string
  startEditGoal: (index: number) => void
  setEditingGoalText: (v: string) => void
  saveGoal: () => void
  deleteGoal: (index: number) => void
  addGoal: (goal: string) => void
}

export default function GoalsPanel({ goals, editingGoalIndex, editingGoalText, startEditGoal, setEditingGoalText, saveGoal, deleteGoal, addGoal }: GoalsPanelProps) {
  return (
    <footer className="p-4 border-t">
      <Tabs defaultValue="goals" className="max-w-7xl mx-auto">
        <TabsList>
          <TabsTrigger value="goals">Learning Goals</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
        </TabsList>
        <TabsContent value="goals">
          <div className="space-y-2">
            {goals.map((goal, index) => (
              <div key={index} className="flex items-center gap-2">
                {editingGoalIndex === index ? (
                  <Input value={editingGoalText} onChange={(e) => setEditingGoalText(e.target.value)} className="flex-1" />
                ) : (
                  <span className="flex-1">{goal}</span>
                )}
                {editingGoalIndex === index ? (
                  <Button size="sm" onClick={saveGoal}>Save</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => startEditGoal(index)}>Edit</Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => deleteGoal(index)}>Delete</Button>
              </div>
            ))}
          </div>
          <Input placeholder="Add new goal" onKeyDown={e => { if (e.key === 'Enter') addGoal((e.currentTarget as HTMLInputElement).value); (e.currentTarget as HTMLInputElement).value = '' }} className="mt-2" />
        </TabsContent>
      </Tabs>
    </footer>
  )
}
