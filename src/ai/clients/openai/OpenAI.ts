import OpenAI from 'openai'
import aiConfig from '@src/configs/ai'

export class OpenAIClient {
  private static instance: OpenAI

  public static getClient(): OpenAI {
    if (!this.instance) {
      this.instance = new OpenAI({
        apiKey: aiConfig.openai.apiKey,
      })
    }

    return this.instance
  }
}
