import { z } from 'zod'

export const chatRequestSchema = z.object({
  message: z.string().min(1),
  knowledgeBaseId: z.string(),
  conversationId: z.string().optional(),
})

export type ChatRequest = z.infer<typeof chatRequestSchema>
