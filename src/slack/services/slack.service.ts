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
      console.log('No text provided, showing help')
      return HELP_MESSAGE
    }

    const args = text.trim().split(/\s+/)
    const command = args[0]
    const subcommand = args[1]
    const rest = args.slice(1).join(' ')
    const mappingType = channelName === 'directmessage' ? 'user' : 'channel'
    const slackId = channelName === 'directmessage' ? userId : channelId

    console.log('Parsed command:', { command, subcommand, rest, mappingType, slackId })

    // /rag set <public-link-id>
    if (command === 'set' && subcommand && args.length === 2) {
      const publicId = subcommand
      console.log('Setting public ID:', { publicId, slackId, mappingType })

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
    if (command === 'remove' && subcommand && args.length === 2) {
      console.log('Removing public ID:', { subcommand, slackId, mappingType })

      const { data: mapping, error: fetchError } = await this.db
        .from('slack_mappings')
        .select('public_link_id')
        .eq('slack_id', slackId)
        .eq('mapping_type', mappingType)
        .single()

      if (fetchError || !mapping) {
        console.log('No mapping found for removal')

        return `No public ID set for ${channelName === 'directmessage' ? 'you' : 'this channel'}.`
      }

      if (mapping.public_link_id !== subcommand) {
        console.log('Public ID mismatch:', { provided: subcommand, current: mapping.public_link_id })

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
    if (command === 'ask' && rest) {
      console.log('Processing ask command:', { rest, slackId, mappingType })

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

      const knowledgeBase = await this.db
        .from('public_links')
        .select('id, knowledge_base_id')
        .eq('id', mapping.public_link_id)
        .single()

      if (!knowledgeBase.data) {
        console.log('Public link not found:', mapping.public_link_id)
        return 'Public link not found'
      }

      const body = PublicChatRequestSchema.parse({
        message: rest,
        context: [],
      })
      const embeddingService = new EmbeddingService()

      console.log('Querying knowledge base:', { knowledgeBaseId: knowledgeBase.data.id })
      return await embeddingService.handleQuery(body.message, knowledgeBase.data.id)
    }

    console.log('No matching command, showing help')
    return HELP_MESSAGE
  }
}
