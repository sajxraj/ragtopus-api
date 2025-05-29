import { Request, Response } from 'express'
import { SupabaseDb } from '@src/supabase/client/supabase'
import { z } from 'zod'
import { PublicChatRequestSchema } from '@src/types'
import { EmbeddingService } from '@src/ai/embedding/services/embedding.service'

export class ChatPublicAction {
  async chat(req: Request, res: Response) {
    if (!req.params.id) {
      return res.status(400).json({ message: 'Token is required.' })
    }

    try {
      const db = SupabaseDb.getInstance()

      const id = z.string().parse(req.params.id)
      const publicLink = await db.from('public_links').select('id, knowledge_base_id').eq('id', id).single()

      if (!publicLink.data) {
        return res.status(400).json({
          message: 'Public link not found',
        })
      }

      const knowledgeBase = await db
        .from('knowledge_bases')
        .select('id, user_id')
        .eq('id', publicLink.data?.knowledge_base_id)
        .single()

      if (!knowledgeBase.data) {
        return res.status(400).json({
          message: 'Knowledge base not found',
        })
      }

      const body = PublicChatRequestSchema.parse(req.body)
      const embeddingService = new EmbeddingService()
      const result = await embeddingService.handleQuery(body.message, knowledgeBase.data.id)

      res.status(200).json(result)
    } catch (error) {
      console.log(error)
      res.status(500).json({
        message: 'Error occurred',
      })
    }
  }
}
