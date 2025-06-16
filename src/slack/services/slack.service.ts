import { SupabaseDb } from '@src/supabase/client/supabase'
import { PublicChatRequestSchema } from '@src/types'
import { EmbeddingService } from '@src/ai/embedding/services/embedding.service'

const HELP_MESSAGE = `Available commands:\n• \`/rag set <public-link-id>\` — Set your public link\n• \`/rag remove <public-link-id>\` — Remove your public link\n• \`/rag ask <question>\` — Ask a question using your mapped public link`

export class SlackService {
  private db: ReturnType<typeof SupabaseDb.getInstance>

  constructor() {
    this.db = SupabaseDb.getInstance()
  }

  async handleCommand(userId: string, text: string, channelId: string, channelName: string): Promise<string> {
    console.log('Handling command:', { userId, text, channelId, channelName })

    // If no text, show help
    if (!text) {
      return HELP_MESSAGE
    }

    const args = text.trim().split(/\s+/)
    const command = args[0]
    const mappingType = channelName === 'directmessage' ? 'user' : 'channel'
    const slackId = channelName === 'directmessage' ? userId : channelId

    console.log('Parsed command:', { command, args, mappingType, slackId })

    // /rag set <public-link-id>
    if (command === 'set' && args.length === 2) {
      const publicId = args[1]

      const { error } = await this.db.from('slack_mappings').upsert(
        {
          slack_id: slackId,
          mapping_type: mappingType,
          public_link_id: publicId,
        },
        {
          onConflict: 'slack_id,mapping_type',
        },
      )
      if (error) {
        console.error('Error setting mapping:', error)
        return `Failed to set public ID \`${publicId}\` for ${channelName === 'directmessage' ? `<@${userId}>` : 'this channel'}`
      }
      return `Public ID \`${publicId}\` set for ${channelName === 'directmessage' ? `<@${userId}>` : 'this channel'}`
    }

    // /rag remove <public-link-id>
    if (command === 'remove' && args.length === 2) {
      const { data: mapping, error: fetchError } = await this.db
        .from('slack_mappings')
        .select('public_link_id')
        .eq('slack_id', slackId)
        .eq('mapping_type', mappingType)
        .single()

      if (fetchError || !mapping) {
        return `No public ID set for ${channelName === 'directmessage' ? 'you' : 'this channel'}.`
      }

      if (mapping.public_link_id !== args[1]) {
        return `The public ID you provided does not match your current mapping.`
      }

      const { error } = await this.db.from('slack_mappings').delete().eq('slack_id', slackId).eq('mapping_type', mappingType)

      if (error) {
        console.error('Error removing mapping:', error)
        throw error
      }
      return `Public ID removed for ${channelName === 'directmessage' ? `<@${userId}>` : 'this channel'}`
    }

    // /rag ask <question>
    if (command === 'ask' && args.length > 1) {
      const question = args.slice(1).join(' ')
      console.log('Processing ask command:', { question, slackId, mappingType })

      const { data: mapping, error } = await this.db
        .from('slack_mappings')
        .select('public_link_id')
        .eq('slack_id', slackId)
        .eq('mapping_type', mappingType)
        .single()
      console.log(mapping)

      if (error || !mapping) {
        console.log('No mapping found for ask')
        return `No public ID set for ${channelName === 'directmessage' ? 'you' : 'this channel'}.\nUse \`/rag set <public-link-id>\` first.`
      }

      const publicLink = await this.db
        .from('public_links')
        .select('id, knowledge_base_id')
        .eq('id', mapping.public_link_id)
        .single()

      if (!publicLink.data) {
        console.log('Public link not found:', mapping.public_link_id)
        return 'Public link not found'
      }

      const body = PublicChatRequestSchema.parse({
        message: question,
        context: [],
      })
      const embeddingService = new EmbeddingService()

      return await embeddingService.handleQuery(body.message, publicLink.data.knowledge_base_id)
    }

    console.log('No matching command, showing help')
    return HELP_MESSAGE
  }
}
