import { EmbeddingInterface } from '@src/ai/embedding/services/strategies/embedding.interface'

export class ConfluenceStrategy implements EmbeddingInterface {
  async generateEmbedding(url: string): Promise<void> {
    console.log(url)
  }
}
