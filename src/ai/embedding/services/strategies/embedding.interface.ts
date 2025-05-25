import { EmbeddingRequest } from '@src/types'

export interface EmbeddingInterface {
  generateEmbedding(body: EmbeddingRequest): Promise<void>
}
