export interface Conversation {
  id: string
  title: string
  last_interacted_at: Date | null
  user_id: string
  description: string
  created_at: Date
  updated_at: Date
}
