import { SupabaseDb } from '@src/supabase/client/supabase'
import { Conversation } from '@src/conversation/types'
import { SupabaseClient } from '@supabase/supabase-js'
import { UnauthorizedError } from '@src/core/errors'
import { NotFoundError } from '@src/core/errors/not-found.error'

export class ConversationService {
  private client: SupabaseClient

  constructor() {
    this.client = SupabaseDb.getInstance()
  }

  async createConversation(user: { id: string; sub: string; email?: string }, title: string): Promise<Conversation> {
    const { data, error } = await this.client
      .from('conversations')
      .insert({
        user_id: user.id,
        title,
        last_interacted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async findById(id: string): Promise<Conversation> {
    const { data, error } = await this.client.from('conversations').select().eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Conversation not found')
      }
      throw error
    }
    if (!data) throw new NotFoundError('Conversation not found')
    return data
  }

  async findAllByUserId(userId: string): Promise<Conversation[]> {
    const { data, error } = await this.client
      .from('conversations')
      .select()
      .eq('user_id', userId)
      .order('last_interacted_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async deleteConversation(id: string): Promise<void> {
    const { count, error } = await this.client.from('conversations').delete().eq('id', id)
    if (error) throw error
    if (count === 0) {
      throw new NotFoundError('Conversation not found')
    }
  }

  async updateLastInteractedAt(id: string): Promise<void> {
    const { error } = await this.client
      .from('conversations')
      .update({ last_interacted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }

  async checkAccess(id: string, userId: string): Promise<Conversation> {
    const conversation = await this.findById(id)
    if (conversation.user_id !== userId) {
      throw new UnauthorizedError('You are not authorized to access this resource')
    }
    return conversation
  }
}
