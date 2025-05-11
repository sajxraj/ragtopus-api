import { google } from 'googleapis'
import { OpenAIClient } from '@src/ai/clients/openai/open-ai'
import { EmbeddingInterface } from '@src/ai/embedding/services/strategies/embedding.interface'
import { SupabaseDb } from '@src/supabase/client/supabase'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import googleConfig from '@src/configs/google'

export class GoogleDocsStrategy implements EmbeddingInterface {
  async generateEmbedding(url: string): Promise<void> {
    try {
      const docId = this.extractDocId(url)

      console.log({
        client_email: googleConfig.clientEmail,
        private_key: googleConfig.privateKey,
      })

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: googleConfig.clientEmail,
          private_key: googleConfig.privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/documents.readonly', 'https://www.googleapis.com/auth/drive.readonly'],
      })

      const drive = google.drive({ version: 'v3', auth })
      const docs = google.docs({ version: 'v1', auth })

      const file = await drive.files.get({
        fileId: docId,
        fields: 'mimeType',
      })

      if (file.data.mimeType !== 'application/vnd.google-apps.document') {
        throw new Error('URL does not point to a Google Doc')
      }

      const doc = await docs.documents.get({
        documentId: docId,
      })

      const content =
        doc.data.body?.content
          ?.map((block) => block.paragraph?.elements?.map((el) => el.textRun?.content).join(''))
          .join('\n') || ''

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      })

      const chunks = await textSplitter.splitText(content)

      const promises = chunks.map(async (chunk) => {
        try {
          const cleanChunk = chunk.replace(/\n/g, ' ')

          const openai = OpenAIClient.getClient()

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
        } catch (error) {
          console.error('Error processing chunk:', error)
          throw error
        }
      })

      await Promise.all(promises)
    } catch (error) {
      console.error('Error in GoogleDocsStrategy:', error)
      throw error
    }
  }

  private extractDocId(url: string): string {
    const patterns = [
      /\/d\/([a-zA-Z0-9-_]+)/, // Standard format
      /id=([a-zA-Z0-9-_]+)/, // Alternative format
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    throw new Error('Invalid Google Docs URL format')
  }
}
