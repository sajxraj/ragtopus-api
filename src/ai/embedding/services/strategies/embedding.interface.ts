export interface EmbeddingInterface {
  generateEmbedding(url: string): Promise<void>
}
