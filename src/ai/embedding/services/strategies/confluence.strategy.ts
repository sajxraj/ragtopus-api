import axios from 'axios'
import { htmlToText } from 'html-to-text'
import { EmbeddingInterface } from '@src/ai/embedding/services/strategies/embedding.interface'
import atlassianConfig from '@src/configs/atlassian'
import { EmbeddingRequest } from '@src/types'
import { EmbeddingUtils } from '@src/ai/embedding/utils/embedding.utils'

function extractConfluenceInfo(url: string): { type: 'page' | 'space'; baseUrl: string; spaceKey: string; pageId?: string } {
  // Page URL: https://example.atlassian.net/wiki/spaces/SPACEKEY/pages/123456789/Page-Title
  const pageMatch = url.match(/(https?:\/\/[^/]+\/wiki)\/spaces\/([^/]+)\/pages\/(\d+)/)
  if (pageMatch) {
    return { type: 'page', baseUrl: pageMatch[1], spaceKey: pageMatch[2], pageId: pageMatch[3] }
  }
  // Space URL: https://example.atlassian.net/wiki/spaces/SPACEKEY
  const spaceMatch = url.match(/(https?:\/\/[^/]+\/wiki)\/spaces\/([^/]+)/)
  if (spaceMatch) {
    return { type: 'space', baseUrl: spaceMatch[1], spaceKey: spaceMatch[2] }
  }
  throw new Error('Invalid Confluence URL format')
}

interface ConfluencePage {
  id: string
  title: string
  body?: {
    storage?: {
      value?: string
    }
  }
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
  try {
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
  } catch (err) {
    console.error('Failed to fetch:', `${apiBase}/content/${pageId}?expand=body.storage`, 'with user:', username)
    if (err instanceof Error) {
      console.error('Error:', err.message)
    } else {
      console.error('Unknown error:', err)
    }
    throw err
  }
}

async function fetchAllPagesInSpace(
  baseUrl: string,
  spaceKey: string,
  username: string,
  apiToken: string,
): Promise<ConfluencePage[]> {
  const auth = { username, password: apiToken }
  const apiBase = `${baseUrl}/rest/api`
  let start = 0
  const limit = 50
  let allPages: ConfluencePage[] = []
  let more = true
  // Fetch all pages in the space (paginated)
  while (more) {
    const res = await axios.get<{ results: ConfluencePage[]; size: number }>(
      `${apiBase}/content?spaceKey=${spaceKey}&type=page&expand=body.storage&limit=${limit}&start=${start}`,
      { auth },
    )
    const results = res.data.results || []
    allPages = allPages.concat(results)
    if (results.length < limit) {
      more = false
    } else {
      start += limit
    }
  }
  // Recursively fetch children for each root page
  const allWithChildren: ConfluencePage[] = []
  for (const page of allPages) {
    allWithChildren.push(page)
    // Recursively fetch children for each root page
    async function fetchChildrenRecursive(pid: string) {
      const res = await axios.get<{ results: ConfluencePage[] }>(
        `${apiBase}/content/${pid}/child/page?expand=body.storage`,
        { auth },
      )
      const children = res.data.results || []
      for (const child of children) {
        allWithChildren.push(child)
        await fetchChildrenRecursive(child.id)
      }
    }
    await fetchChildrenRecursive(page.id)
  }
  return allWithChildren
}

export class ConfluenceStrategy implements EmbeddingInterface {
  async generateEmbedding(body: EmbeddingRequest): Promise<void> {
    try {
      const apiToken = atlassianConfig.apiToken
      if (!apiToken) {
        throw new Error('Missing Atlassian configuration.')
      }
      if (!body.url) {
        throw new Error('URL is required for Confluence embedding.')
      }
      const info = extractConfluenceInfo(body.url)
      let pages: ConfluencePage[] = []
      if (info.type === 'page') {
        pages = await fetchPageAndChildren(
          info.baseUrl,
          info.pageId!,
          'sajan.rajbhandari@outside.studio',
          apiToken,
          body?.fetchChildren ?? false,
        )
      } else if (info.type === 'space') {
        pages = await fetchAllPagesInSpace(info.baseUrl, info.spaceKey, 'sajan.rajbhandari@outside.studio', apiToken)
      }

      // Convert all pages to text and combine
      const content = pages.map((page) => htmlToText(page.body?.storage?.value || '', { wordwrap: false })).join('\n\n')

      await EmbeddingUtils.processContent(content, body)
    } catch (error) {
      console.error('Error in ConfluenceStrategy:', error)
      throw error
    }
  }
}
