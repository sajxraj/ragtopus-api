import { OpenAIClient } from '@src/ai/clients/openai/open-ai'
import { SupabaseDb } from '@src/supabase/client/supabase'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { EmbeddingRequest } from '@src/types'

export class EmbeddingUtils {
  private static textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  })

  static async generateEmbedding(text: string): Promise<number[]> {
    const cleanText = text.replace(/\n/g, ' ')
    const openai = OpenAIClient.getClient()
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: cleanText,
    })
    return embeddingResponse.data[0].embedding
  }

  static async storeInDatabase(content: string, embedding: number[], body: EmbeddingRequest): Promise<void> {
    const supabase = SupabaseDb.getInstance()
    const insertData: { document_link_id?: string; content: string; embedding: number[]; knowledge_base_id: string } = {
      content: content.replace(/\n/g, ' '),
      embedding,
      knowledge_base_id: body.knowledgeBaseId,
    }
    if (body.documentLinkId) {
      insertData.document_link_id = body.documentLinkId
    }
    const { error } = await supabase.from('documents').insert(insertData)
    if (error) {
      throw error
    }
  }

  static async processContent(content: string, body: EmbeddingRequest): Promise<void> {
    try {
      const chunks = await this.textSplitter.splitText(content)

      const promises = chunks.map(async (chunk) => {
        const embedding = await this.generateEmbedding(chunk)
        await this.storeInDatabase(chunk, embedding, body)
      })

      await Promise.all(promises)
    } catch (error) {
      console.error('Error in processContent:', error)
      throw error
    }
  }
}
