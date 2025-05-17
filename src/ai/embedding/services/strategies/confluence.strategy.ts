import axios from 'axios'
import { htmlToText } from 'html-to-text'
import { EmbeddingInterface } from '@src/ai/embedding/services/strategies/embedding.interface'
import { SupabaseDb } from '@src/supabase/client/supabase'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { OpenAIClient } from '@src/ai/clients/openai/open-ai'
import atlassianConfig from '@src/configs/atlassian'

function extractConfluenceIds(url: string): { baseUrl: string; spaceKey: string; pageId: string } {
  const match = url.match(/(https?:\/\/[^/]+\/wiki)\/spaces\/([^/]+)\/pages\/(\d+)/)
  if (!match) throw new Error('Invalid Confluence URL format')
  return { baseUrl: match[1], spaceKey: match[2], pageId: match[3] }
}

interface ConfluencePage {
  id: string
  title: string
  body?: {
    storage?: {
      value?: string
    }
  }
  // Add more fields as needed
}

async function fetchPageAndChildren(
  baseUrl: string,
  pageId: string,
  username: string,
  apiToken: string,
  fetchChildren = true,
): Promise<ConfluencePage[]> {
  const auth = { username, password: apiToken }
  const apiBase = `${baseUrl}/rest/api`
  // Fetch main page
  const mainPage = await axios.get<{ id: string; title: string; body?: { storage?: { value?: string } } }>(
    `${apiBase}/content/${pageId}?expand=body.storage`,
    { auth },
  )
  const pages: ConfluencePage[] = [mainPage.data]
  if (fetchChildren) {
    async function fetchChildrenRecursive(pid: string) {
      const res = await axios.get<{ results: ConfluencePage[] }>(
        `${apiBase}/content/${pid}/child/page?expand=body.storage`,
        { auth },
      )
      const children = res.data.results || []
      for (const child of children) {
        pages.push(child)
        await fetchChildrenRecursive(child.id)
      }
    }
    await fetchChildrenRecursive(pageId)
  }
  return pages
}

export class ConfluenceStrategy implements EmbeddingInterface {
  async generateEmbedding(url: string, opts?: { fetchChildren: boolean }): Promise<void> {
    try {
      const apiToken = atlassianConfig.apiToken
      if (!apiToken) {
        throw new Error('Missing Atlassian configuration.')
      }

      const { baseUrl, spaceKey, pageId } = extractConfluenceIds(url)

      // Fetch main page and all children recursively
      const pages = await fetchPageAndChildren(
        baseUrl,
        pageId,
        'sajan.rajbhandari@outside.studio',
        apiToken,
        opts?.fetchChildren ?? false,
      )

      const docs = pages.map((page) => ({
        pageContent: htmlToText(page.body?.storage?.value || '', { wordwrap: false }),
        metadata: {
          id: page.id,
          title: page.title,
          url: `${baseUrl}/spaces/${spaceKey}/pages/${page.id}`,
        },
      }))

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      })
      const chunks = await textSplitter.splitDocuments(docs)
      const openai = OpenAIClient.getClient()
      const db = SupabaseDb.getInstance()
      const promises = chunks.map(async (chunk) => {
        const cleanChunk = chunk.pageContent.replace(/\n/g, ' ')
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: cleanChunk,
        })
        const [{ embedding }] = embeddingResponse.data
        const { error } = await db.from('documents').insert({
          content: cleanChunk,
          embedding,
        })
        if (error) {
          throw error
        }
      })
      await Promise.all(promises)
    } catch (error) {
      console.error('Error in ConfluenceStrategy:', error)
      throw error
    }
  }
}
