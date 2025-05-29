import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio'
import { EmbeddingInterface } from '@src/ai/embedding/services/strategies/embedding.interface'
import { EmbeddingRequest } from '@src/types'
import { EmbeddingUtils } from '@src/ai/embedding/utils/embedding.utils'

export class WebCrawlerStrategy implements EmbeddingInterface {
  async generateEmbedding(body: EmbeddingRequest): Promise<void> {
    if (!body.url) {
      throw new Error('URL is required for Web embedding.')
    }

    const loader = new CheerioWebBaseLoader(body.url)
    const docs = await loader.load()

    const content = docs.map((doc) => doc.pageContent).join('\n\n')
    await EmbeddingUtils.processContent(content, body)
  }
}
