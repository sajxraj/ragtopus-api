import { SupabaseDb } from '@src/supabase/client/supabase'
import { Chat, ChatRole } from '@src/chat/types'
import { ConversationService } from '@src/conversation/services/conversation.service'
import { Response } from 'express'
import { SupabaseClient } from '@supabase/supabase-js'
import { UnauthorizedError } from '@src/core/errors'
import { EmbeddingService } from '@src/ai/embedding/services/embedding.service'
import { Role } from '@src/ai/types'

export class ChatService {
  private client: SupabaseClient
  private conversationService: ConversationService

  constructor() {
    this.client = SupabaseDb.getInstance()
    this.conversationService = new ConversationService()
  }

  private convertChatRoleToRole(chatRole: ChatRole): Role {
    switch (chatRole) {
      case ChatRole.USER:
        return Role.USER
      case ChatRole.ASSISTANT:
        return Role.ASSISTANT
      case ChatRole.SYSTEM:
        return Role.SYSTEM
      default:
        return Role.USER
    }
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
      const { data: knowledgeBase, error: kbError } = await this.client
        .from('knowledge_bases')
        .select('id, user_id')
        .eq('id', body.knowledgeBaseId)
        .single()

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

      const previousChats = await this.findAllByConversationId(conversationId)
      const context = previousChats
        .filter((chat) => chat.message && chat.message.trim().length > 0)
        .map((chat) => ({
          role: this.convertChatRoleToRole(chat.role),
          message: chat.message.trim(),
        }))

      const embeddingService = new EmbeddingService()
      const stream = await embeddingService.handleQueryStream(body.message, body.knowledgeBaseId, context)

      let fullResponse = ''

      for await (const chunk of stream) {
        if (!res.writableEnded) {
          fullResponse += chunk
          const message = JSON.stringify({
            message: chunk,
            conversationId,
          })
          res.write(`data: ${message}\n\n`)
        }
      }

      await this.createChat(fullResponse, ChatRole.ASSISTANT, null, conversationId)
      await this.conversationService.updateLastInteractedAt(conversationId)

      if (!res.writableEnded) {
        console.log('Stream complete, sending [DONE]')
        res.write('data: [DONE]\n\n')
        res.end()
      }
    } catch (error) {
      console.error('Error in streamText:', error)
      if (error instanceof Error) {
        console.error('Error stack:', error.stack)
      }
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`)
        res.end()
      }
    }
  }
}
