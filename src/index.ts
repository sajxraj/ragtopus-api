import jwt from 'jsonwebtoken'
import 'dotenv/config'
import express, { Express, Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import multer from 'multer'
import { EmbeddingService } from '@src/ai/embedding/services/embedding.service'
import { verifySupabaseToken } from '@src/supabase/middlewares/verify-auth-token.middlware'
import type {} from './types/express'
import { ChatRequestSchema, EmbeddingRequestSchema, PdfEmbeddingRequestSchema, PublicChatRequestSchema } from '@src/types'
import { SupabaseDb } from '@src/supabase/client/supabase'
import { z } from 'zod'
import * as process from 'node:process'

const app: Express = express()
const port = process.env.PORT || 3000

const storage = multer.memoryStorage()
const upload = multer({ storage })

app.use(bodyParser.json())

app.get('/', (_req: Request, res: Response) => {
  res.send({
    message: 'Server is working perfectly!',
  })
})

const multerUpload = upload.single('file') as unknown as (req: Request, res: Response, next: NextFunction) => void

app.post('/embed', verifySupabaseToken, multerUpload, async (req: Request, res: Response) => {
  const db = SupabaseDb.getInstance()

  if (!req.body.knowledgeBaseId) {
    return res.status(400).json({ message: 'knowledgeBaseId is required.' })
  }

  const knowledgeBase = await db.from('knowledge_bases').select('id, user_id').eq('id', req.body.knowledgeBaseId).single()

  if (!knowledgeBase.data) {
    return res.status(400).json({
      message: 'Knowledge base not found',
    })
  }

  if (knowledgeBase.data.user_id !== req.user?.sub) {
    return res.status(403).json({
      message: 'You do not have permission to add to this knowledge base',
    })
  }

  try {
    let validatedBody
    if (req.file) {
      const pdfRequestBody = { ...req.body, sourceType: 'pdf' }
      validatedBody = PdfEmbeddingRequestSchema.parse(pdfRequestBody)
    } else {
      validatedBody = EmbeddingRequestSchema.parse(req.body)
    }

    const embeddingService = new EmbeddingService()
    await embeddingService.generateEmbedding(validatedBody, req.file)

    res.send({
      message: 'Successfully added to the knowledge base',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors })
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to process embedding request due to an unexpected error.'
    return res.status(500).json({ message: errorMessage })
  }
})

app.post('/v1/knowledge-bases/:id/public-links', verifySupabaseToken, async (req: Request, res: Response) => {
  try {
    const db = SupabaseDb.getInstance()
    const knowledgeBase = await db.from('knowledge_bases').select('id, user_id').eq('id', req.params.id).single()

    if (!knowledgeBase.data) {
      return res.status(400).json({
        message: 'Knowledge base not found',
      })
    }

    if (knowledgeBase.data.user_id !== req.user?.sub) {
      return res.status(403).json({
        message: 'You do not have permission to create a public link for this knowledge base',
      })
    }

    const existingPublicLink = await db
      .from('public_links')
      .select('id, knowledge_base_id')
      .eq('knowledge_base_id', knowledgeBase.data.id)
      .single()

    if (existingPublicLink.data) {
      return res.send({
        id: existingPublicLink.data.id,
        knowledgeBaseId: existingPublicLink.data.knowledge_base_id,
      })
    }

    const publicLink = await db
      .from('public_links')
      .insert({
        knowledge_base_id: knowledgeBase.data.id,
        user_id: knowledgeBase.data.user_id,
      })
      .select('id, knowledge_base_id')
      .single()

    if (!publicLink.data) {
      return res.status(400).json({
        message: 'Failed to create public link',
      })
    }

    res.send({
      id: publicLink.data.id,
      knowledgeBaseId: publicLink.data.knowledge_base_id,
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Failed to create public link' })
  }
})

app.post('/public/v1/chat/:id', verifySupabaseToken, async (req: Request, res: Response) => {
  if (!req.params.id) {
    return res.status(400).json({ message: 'Token is required.' })
  }

  try {
    const db = SupabaseDb.getInstance()

    const id = z.string().parse(req.params.id)
    const publicLink = await db.from('public_links').select('id, knowledge_base_id').eq('id', id).single()

    if (!publicLink.data) {
      return res.status(400).json({
        message: 'Public link not found',
      })
    }

    const knowledgeBase = await db
      .from('knowledge_bases')
      .select('id, user_id')
      .eq('id', publicLink.data?.knowledge_base_id)
      .single()

    if (!knowledgeBase.data) {
      return res.status(400).json({
        message: 'Knowledge base not found',
      })
    }

    const body = PublicChatRequestSchema.parse(req.body)
    const embeddingService = new EmbeddingService()
    const result = await embeddingService.handleQuery(body.message, knowledgeBase.data.id)

    res.status(200).json(result)
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: 'Error occurred',
    })
  }
})

app.post('/query', verifySupabaseToken, async (req: Request, res: Response) => {
  try {
    const db = SupabaseDb.getInstance()
    const knowledgeBase = await db.from('knowledge_bases').select('id, user_id').eq('id', req.body.knowledgeBaseId).single()

    if (!knowledgeBase.data) {
      return res.status(400).json({
        message: 'Knowledge base not found',
      })
    }

    if (knowledgeBase.data.user_id !== req.user?.sub) {
      return res.status(403).json({
        message: 'You do not have permission to query this knowledge base',
      })
    }

    const body = ChatRequestSchema.parse(req.body)
    const embeddingService = new EmbeddingService()
    const result = await embeddingService.handleQuery(body.query, body.knowledgeBaseId)

    res.status(200).json(result)
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: 'Error occurred',
    })
  }
})

app.post('/auth', (req: Request, res: Response) => {
  const payload = {
    sub: req.body.userId,
    email: req.body.email,
    role: 'authenticated',
    aud: 'authenticated',
  }

  const token = jwt.sign(payload, process.env.SUPABASE_JWT_SECRET!, { expiresIn: '1h' })

  res.status(200).json({
    data: token,
  })
})

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`)
})
