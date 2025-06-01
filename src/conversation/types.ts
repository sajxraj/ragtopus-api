export interface Conversation {
  id: string
  title: string
  lastInteractedAt: Date | null
  userId: string
  description: string
  createdAt: Date
  updatedAt: Date
}
