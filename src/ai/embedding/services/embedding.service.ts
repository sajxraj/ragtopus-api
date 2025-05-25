import { EmbeddingFactory } from '@src/ai/embedding/services/embedding.factory'
import { OpenAIClient } from '@src/ai/clients/openai/open-ai'
import { SupabaseDb } from '@src/supabase/client/supabase'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { EmbeddingRequest } from '@src/types'
import { EmbeddingUtils } from '@src/ai/embedding/utils/embedding.utils'

export class EmbeddingService {
  generateEmbedding = async (body: EmbeddingRequest): Promise<void> => {
    const embeddingStrategy = new EmbeddingFactory().create(body.url)
    await embeddingStrategy.generateEmbedding(body)
  }

  async handleQuery(query: string) {
    const input = query.replace(/\n/g, ' ')
    const embedding = await EmbeddingUtils.generateEmbedding(input)

    const db = SupabaseDb.getInstance()
    const { data: documents, error } = await db.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 10,
    })

    if (error) {
      throw error
    }

    let contextText = ''
    contextText += documents.map((document: { content: string }) => `${document.content.trim()}---\n`).join('')

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a helpful assistant. You are given the context sections below. 
          Use them to answer the question. 
          If you don't know the answer, just say that you don't know, don't try to make up an answer.`,
      },
      {
        role: 'user',
        content: `Context sections: "${contextText}" Question: "${query}" Answer as simple text:`,
      },
    ]

    const openai = OpenAIClient.getClient()
    const completion = await openai.chat.completions.create({
      messages,
      model: 'gpt-4',
      temperature: 0.8,
    })

    return completion.choices[0].message.content
  }
}
