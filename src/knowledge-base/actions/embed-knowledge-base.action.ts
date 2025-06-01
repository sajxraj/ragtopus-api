import { Request, Response } from 'express'
import { SupabaseDb } from '@src/supabase/client/supabase'
import { EmbeddingRequestSchema, PdfEmbeddingRequestSchema } from '@src/types'
import { EmbeddingService } from '@src/ai/embedding/services/embedding.service'
import { z } from 'zod'

export class EmbedKnowledgeBaseAction {
  async embed(req: Request, res: Response) {
    const supabase = SupabaseDb.getInstance()

    if (!req.body.knowledgeBaseId) {
      return res.status(400).json({ message: 'knowledgeBaseId is required.' })
    }

    const knowledgeBase = await supabase
      .from('knowledge_bases')
      .select('id, user_id')
      .eq('id', req.body.knowledgeBaseId)
      .single()

    if (!knowledgeBase.data) {
      return res.status(400).json({
        message: 'Knowledge base not found',
      })
    }

    if (knowledgeBase.data.user_id !== req.user?.sub) {
      return res.status(403).json({
        message: 'You do not have permission to add to this knowledge base',
      })
    }

    try {
      let validatedBody
      if (req.file) {
        const pdfRequestBody = { ...req.body, sourceType: 'pdf' }
        validatedBody = PdfEmbeddingRequestSchema.parse(pdfRequestBody)
      } else {
        validatedBody = EmbeddingRequestSchema.parse(req.body)
      }

      const embeddingService = new EmbeddingService()
      await embeddingService.generateEmbedding(validatedBody, req.file)

      res.send({
        message: 'Successfully added to the knowledge base',
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors })
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to process embedding request due to an unexpected error.'

      return res.status(500).json({ message: errorMessage })
    }
  }
}
