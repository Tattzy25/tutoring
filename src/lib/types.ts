export type Role = 'user' | 'tutor'
export interface Message {
  role: Role
  content: string
}
export interface JournalEntry {
  date: string
  summary: string
}
export type Mode = 'casual' | 'structured'
export type ApiProvider = 'openai' | 'groq'
export interface ProgressState {
  vocabulary: number
  grammar: number
  duration: number
}
