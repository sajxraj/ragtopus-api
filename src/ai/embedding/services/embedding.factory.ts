import { GoogleDocsStrategy } from '@src/ai/embedding/services/strategies/google-docs.strategy'
import { WebCrawlerStrategy } from '@src/ai/embedding/services/strategies/web-crawler.strategy'
import { ConfluenceStrategy } from '@src/ai/embedding/services/strategies/confluence.strategy'
import { EmbeddingInterface } from '@src/ai/embedding/services/strategies/embedding.interface'

export class EmbeddingFactory {
  create(url: string): EmbeddingInterface {
    if (url.includes('docs.google.com/document/d/')) {
      return new GoogleDocsStrategy()
    }

    if (url.includes('confluence.atlassian.com')) {
      return new ConfluenceStrategy()
    }

    return new WebCrawlerStrategy()
  }
}
