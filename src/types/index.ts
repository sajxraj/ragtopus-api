import { z } from 'zod'
import { Role } from '@src/ai/types'

export const EmbeddingRequestSchema = z.object({
  url: z.string().optional(), // Made url optional
  knowledgeBaseId: z.string(),
  fetchChildren: z.boolean().optional(),
  documentLinkId: z.string().optional(),
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

export const ChatContextSchema = z
  .object({
    role: z.nativeEnum(Role),
    message: z.string(),
  })
  .optional()
export type ChatContext = z.infer<typeof ChatContextSchema>

export const PublicChatRequestSchema = z.object({
  message: z.string(),
  context: z
    .array(
      z.object({
        role: z.nativeEnum(Role),
        message: z.string(),
      }),
    )
    .optional(),
})
export type PublicChatRequest = z.infer<typeof PublicChatRequestSchema>
