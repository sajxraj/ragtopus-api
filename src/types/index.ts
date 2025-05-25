import { z } from 'zod'

export const EmbeddingRequestSchema = z.object({
  url: z.string(),
  knowledgeBaseId: z.string(),
  userId: z.string(),
  fetchChildren: z.boolean().optional(),
})
export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>
