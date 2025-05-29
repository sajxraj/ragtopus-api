import { EmbeddingFactory } from '@src/ai/embedding/services/embedding.factory'
import { SupabaseDb } from '@src/supabase/client/supabase'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { AnyEmbeddingRequest, ChatContext, ChatContextSchema, EmbeddingRequest, PdfEmbeddingRequest } from '@src/types'
import { EmbeddingUtils } from '@src/ai/embedding/utils/embedding.utils'
import { z } from 'zod'
import { OpenAIClient } from '@src/ai/clients/openai/open-ai'
import { PdfStrategy } from '@src/ai/embedding/services/strategies/pdf.strategy'

export class EmbeddingService {
  generateEmbedding = async (body: AnyEmbeddingRequest, file?: Express.Multer.File): Promise<void> => {
    if (file && (body as PdfEmbeddingRequest).sourceType === 'pdf') {
      const pdfStrategy = new PdfStrategy()
      await pdfStrategy.generateEmbedding(body as PdfEmbeddingRequest, file)
    } else if (body.url) {
      const embeddingStrategy = new EmbeddingFactory().create(body.url)
      await embeddingStrategy.generateEmbedding(body as EmbeddingRequest)
    } else {
      throw new Error('Invalid embedding request: Missing URL or file for PDF.')
    }
  }

  async handleQuery(query: string, knowledgeBaseId: string, context?: ChatContext[]): Promise<string> {
    const embedding = await EmbeddingUtils.generateEmbedding(query)

    const db = SupabaseDb.getInstance()
    const { data: documents, error } = await db.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.1,
      match_count: 30,
      kb_id: knowledgeBaseId,
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
        role: 'system',
        content: `Context sections: "${contextText}"`,
      },
      ...((context || []).map((c) => ChatContextSchema.parse(c)) as ChatCompletionMessageParam[]),
      {
        role: 'user',
        content: `Question: "${query}"`,
      },
    ]

    const openai = OpenAIClient.getClient()
    const completion = await openai.chat.completions.create({
      messages,
      model: 'gpt-4',
      temperature: 0.8,
    })

    return z.string().parse(completion.choices[0].message.content)
  }
}
