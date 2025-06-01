import { SupabaseDb } from '@src/supabase/client/supabase'
import { Chat, ChatRole } from '@src/chat/types'
import { ConversationService } from '@src/conversation/services/conversation.service'
import { Response } from 'express'
import { SupabaseClient } from '@supabase/supabase-js'
import { UnauthorizedError } from '@src/core/errors'
import { EmbeddingService } from '@src/ai/embedding/services/embedding.service'

export class ChatService {
  private client: SupabaseClient
  private conversationService: ConversationService

  constructor() {
    this.client = SupabaseDb.getInstance()
    this.conversationService = new ConversationService()
  }

  async createChat(message: string, role: ChatRole, userId: string | null, conversationId: string): Promise<Chat> {
    const { data, error } = await this.client
      .from('chats')
      .insert({
        message,
        role,
        user_id: userId,
        conversation_id: conversationId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async findAllByConversationId(conversationId: string): Promise<Chat[]> {
    const { data, error } = await this.client
      .from('chats')
      .select()
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  async streamText(
    body: { message: string; knowledgeBaseId: string; conversationId?: string },
    res: Response,
    user: { id: string; sub: string; email?: string },
  ) {
    try {
      console.log('Starting streamText with:', { body, user })

      const { data: knowledgeBase, error: kbError } = await this.client
        .from('knowledge_bases')
        .select('id, user_id')
        .eq('id', body.knowledgeBaseId)
        .single()

      console.log('Knowledge base query result:', { knowledgeBase, kbError })

      if (kbError) {
        console.error('Knowledge base query error:', kbError)
        throw new Error(`Failed to fetch knowledge base: ${kbError.message}`)
      }

      if (!knowledgeBase) {
        throw new Error('Knowledge base not found')
      }

      if (knowledgeBase.user_id !== user.sub) {
        throw new UnauthorizedError('You do not have permission to access this knowledge base')
      }

      let conversationId = body.conversationId

      if (!conversationId) {
        const conversation = await this.conversationService.createConversation(
          { id: user.id, sub: user.sub, email: user.email || '' },
          body.message.substring(0, 50) + '...',
        )
        conversationId = conversation.id
      }

      await this.createChat(body.message, ChatRole.USER, user.id, conversationId)

      const embeddingService = new EmbeddingService()
      await embeddingService.handleQuery(body.message, body.knowledgeBaseId)

      const aiResponse = 'AI response will be implemented here'
      await this.createChat(aiResponse, ChatRole.ASSISTANT, null, conversationId)
      await this.conversationService.updateLastInteractedAt(conversationId)

      res.write(`data: ${JSON.stringify({ message: aiResponse })}\n\n`)
    } catch (error) {
      console.error('Error in streamText:', error)
      if (error instanceof Error) {
        console.error('Error stack:', error.stack)
      }
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`)
    }
  }
}
