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
      let documentLinkId: string | undefined
      if (req.file) {
        // For PDF uploads
        const { data: linkData, error: linkError } = await supabase
          .from('document_links')
          .insert({
            filename: req.file.originalname,
            user_id: req.user?.sub,
            knowledge_base_id: knowledgeBase.data.id,
          })
          .select('id')
          .single()
        if (linkError || !linkData) {
          return res.status(500).json({ message: 'Failed to create document link' })
        }
        documentLinkId = linkData.id
        const pdfRequestBody = { ...req.body, sourceType: 'pdf', documentLinkId, userId: req.user?.sub }
        validatedBody = PdfEmbeddingRequestSchema.parse(pdfRequestBody)
      } else {
        // For URL/link uploads
        const { url } = req.body
        const { data: linkData, error: linkError } = await supabase
          .from('document_links')
          .insert({
            url,
            user_id: req.user?.sub,
            knowledge_base_id: knowledgeBase.data.id,
          })
          .select('id')
          .single()
        if (linkError || !linkData) {
          return res.status(500).json({ message: 'Failed to create document link' })
        }
        documentLinkId = linkData.id
        validatedBody = EmbeddingRequestSchema.parse({ ...req.body, documentLinkId, userId: req.user?.sub })
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
