export interface EmbeddingInterface {
  generateEmbedding(url: string, opts?: { fetchChildren: boolean }): Promise<void>
}
