import { Request, Response } from 'express'
import { SupabaseDb } from '@src/supabase/client/supabase'
import { z } from 'zod'
import { PublicChatRequestSchema } from '@src/types'
import { EmbeddingService } from '@src/ai/embedding/services/embedding.service'

export class ChatPublicService {
  private async validateRequest(req: Request) {
    if (!req.params.id) {
      throw new Error('Token is required.')
    }

    const supabase = SupabaseDb.getInstance()
    const id = z.string().parse(req.params.id)
    const publicLink = await supabase.from('public_links').select('id, knowledge_base_id, secret').eq('id', id).single()

    if (!publicLink.data) {
      throw new Error('Public link not found')
    }

    const token = req.header('x-ragtopus-token')
    if (!token || token !== publicLink.data.secret) {
      throw new Error('Unauthorized')
    }

    const knowledgeBase = await supabase
      .from('knowledge_bases')
      .select('id, user_id')
      .eq('id', publicLink.data?.knowledge_base_id)
      .single()

    if (!knowledgeBase.data) {
      throw new Error('Knowledge base not found')
    }

    return knowledgeBase.data
  }

  async chat(req: Request, res: Response) {
    try {
      const knowledgeBase = await this.validateRequest(req)
      const body = PublicChatRequestSchema.parse(req.body)
      const embeddingService = new EmbeddingService()
      const result = await embeddingService.handleQuery(body.message, knowledgeBase.id)

      res.status(200).json({ message: result })
    } catch (error) {
      console.error('Error in chat:', error)
      if (error instanceof Error) {
        res.status(error.message === 'Unauthorized' ? 401 : 400).json({ message: error.message })
      } else {
        res.status(500).json({ message: 'Error occurred' })
      }
    }
  }

  async streamedChat(req: Request, res: Response) {
    try {
      const knowledgeBase = await this.validateRequest(req)
      const body = PublicChatRequestSchema.parse(req.body)
      const embeddingService = new EmbeddingService()
      const stream = await embeddingService.handleQueryStream(body.message, knowledgeBase.id, body.context)

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Transfer-Encoding', 'chunked')

      if (res.socket) {
        res.socket.setNoDelay(true)
        res.socket.setTimeout(0)
      }

      for await (const chunk of stream) {
        if (!res.writableEnded) {
          const message = JSON.stringify({
            message: chunk,
          })
          res.write(`data: ${message}\n\n`)
        }
      }

      if (!res.writableEnded) {
        res.write('data: [DONE]\n\n')
        res.end()
      }
    } catch (error) {
      console.error('Error in streamedChat:', error)
      if (error instanceof Error) {
        console.error('Error stack:', error.stack)
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
          res.end()
        }
      } else {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: 'Unknown error' })}\n\n`)
          res.end()
        }
      }
    }
  }
}
