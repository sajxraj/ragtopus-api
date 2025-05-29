import { z } from 'zod'

export const EmbeddingRequestSchema = z.object({
  url: z.string().optional(), // Made url optional
  knowledgeBaseId: z.string(),
  fetchChildren: z.boolean().optional(),
})
export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>

export const ChatRequestSchema = z.object({
  query: z.string(),
  knowledgeBaseId: z.string(),
})
export type ChatRequest = z.infer<typeof ChatRequestSchema>

export const PdfEmbeddingRequestSchema = EmbeddingRequestSchema.extend({
  sourceType: z.literal('pdf'),
})
export type PdfEmbeddingRequest = z.infer<typeof PdfEmbeddingRequestSchema>

export const AnyEmbeddingRequestSchema = z.union([EmbeddingRequestSchema, PdfEmbeddingRequestSchema])
export type AnyEmbeddingRequest = z.infer<typeof AnyEmbeddingRequestSchema>
