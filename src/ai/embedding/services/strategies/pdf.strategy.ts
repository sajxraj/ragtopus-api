import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import type { Document } from 'langchain/document'
import { EmbeddingInterface } from '@src/ai/embedding/services/strategies/embedding.interface'
import { EmbeddingUtils } from '@src/ai/embedding/utils/embedding.utils'
import { PdfEmbeddingRequest } from '@src/types'

export class PdfStrategy implements EmbeddingInterface {
  async generateEmbedding(body: PdfEmbeddingRequest, file?: Express.Multer.File): Promise<void> {
    if (!file) {
      throw new Error('File is required for PDF embedding.')
    }

    const blob = new Blob([file.buffer], { type: file.mimetype })
    const loader = new PDFLoader(blob)
    const docs = await loader.load()

    const content = docs.map((doc: Document) => doc.pageContent).join('\n\n')
    await EmbeddingUtils.processContent(content, {
      knowledgeBaseId: body.knowledgeBaseId,
      url: undefined,
    })
  }
}
