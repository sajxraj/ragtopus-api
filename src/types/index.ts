import { z } from 'zod'

export const EmbeddingRequestSchema = z.object({
  url: z.string(),
  knowledgeBaseId: z.string(),
  fetchChildren: z.boolean().optional(),
})
export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>

export const ChatRequestSchema = z.object({
  query: z.string(),
  knowledgeBaseId: z.string(),
})
export type ChatRequest = z.infer<typeof ChatRequestSchema>
