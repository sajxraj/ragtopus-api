export enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export interface Chat {
  id: string
  message: string
  userId: string | null
  conversationId: string
  role: ChatRole
  createdAt: Date
  updatedAt: Date
}
