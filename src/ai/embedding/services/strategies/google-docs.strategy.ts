import { google } from 'googleapis'
import { EmbeddingInterface } from '@src/ai/embedding/services/strategies/embedding.interface'
import googleConfig from '@src/configs/google'
import { EmbeddingRequest } from '@src/types'
import { EmbeddingUtils } from '@src/ai/embedding/utils/embedding.utils'

export class GoogleDocsStrategy implements EmbeddingInterface {
  async generateEmbedding(body: EmbeddingRequest): Promise<void> {
    try {
      if (!body.url) {
        throw new Error('URL is required for Google Docs embedding.')
      }

      const docId = this.extractDocId(body.url)

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

      await EmbeddingUtils.processContent(content, {
        ...body,
        documentLinkId: body.documentLinkId,
      })
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
