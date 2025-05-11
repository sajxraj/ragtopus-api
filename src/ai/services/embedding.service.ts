export class EmbeddingService {
  generateEmbedding = async (url: string): Promise<number[]> => {
    const content = await this.getEmbeddableContent(url);
  }

  private getEmbeddableContent(url: string): Promise<string> {
    // check if url is google docs url
    const isGoogleDocsUrl = url.includes('docs.google.com/document/d/')
    if (isGoogleDocsUrl) {
      return this.extractGoogleDocsContent(url);
    }

    // check if confluence url
    const isConfluenceUrl = url.includes('confluence.atlassian.com')
    if (isConfluenceUrl) {
      return this.extractConfluenceContent(url);
    }
  }

  private function extractGoogleDocsContent(url: string): Promise<string> {

  }

  private function extractConfluenceContent(url: string): Promise<string> {

  }
}
