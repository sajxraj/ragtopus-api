import { Request, Response } from 'express'
import { SupabaseDb } from '@src/supabase/client/supabase'

export class GeneratePublicLinkAction {
  async generate(req: Request, res: Response) {
    try {
      const supabase = SupabaseDb.getInstance()
      const knowledgeBase = await supabase.from('knowledge_bases').select('id, user_id').eq('id', req.params.id).single()

      if (!knowledgeBase.data) {
        return res.status(400).json({
          message: 'Knowledge base not found',
        })
      }

      if (knowledgeBase.data.user_id !== req.user?.sub) {
        return res.status(403).json({
          message: 'You do not have permission to create a public link for this knowledge base',
        })
      }

      const existingPublicLink = await supabase
        .from('public_links')
        .select('id, knowledge_base_id')
        .eq('knowledge_base_id', knowledgeBase.data.id)
        .single()

      if (existingPublicLink.data) {
        return res.send({
          id: existingPublicLink.data.id,
          knowledgeBaseId: existingPublicLink.data.knowledge_base_id,
        })
      }

      if (!req.body?.secret) {
        return res.status(422).json({
          message: 'Secret is required to create a public link',
        })
      }

      const publicLink = await supabase
        .from('public_links')
        .insert({
          knowledge_base_id: knowledgeBase.data.id,
          user_id: knowledgeBase.data.user_id,
          secret: req.body.secret,
        })
        .select('id, knowledge_base_id')
        .single()

      if (!publicLink.data) {
        return res.status(400).json({
          message: 'Failed to create public link',
        })
      }

      res.send({
        id: publicLink.data.id,
        knowledgeBaseId: publicLink.data.knowledge_base_id,
      })
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: 'Failed to create public link' })
    }
  }
}
