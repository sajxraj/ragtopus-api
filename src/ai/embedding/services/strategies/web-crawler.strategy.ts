import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio'
import { EmbeddingInterface } from '@src/ai/embedding/services/strategies/embedding.interface'
import { SupabaseDb } from '@src/supabase/client/supabase'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import OpenAI from 'openai'

export class WebCrawlerStrategy implements EmbeddingInterface {
  async generateEmbedding(url: string): Promise<void> {
    const loader = new CheerioWebBaseLoader(url)
    const docs = await loader.load()

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    })

    const chunks = await textSplitter.splitDocuments(docs)

    const promises = chunks.map(async (chunk) => {
      const cleanChunk = chunk.pageContent.replace(/\n/g, ' ')

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
      })

      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: cleanChunk,
      })

      const [{ embedding }] = embeddingResponse.data

      const db = SupabaseDb.getInstance()
      const { error } = await db.from('documents').insert({
        content: cleanChunk,
        embedding,
      })

      if (error) {
        throw error
      }
    })

    await Promise.all(promises)
  }
}
