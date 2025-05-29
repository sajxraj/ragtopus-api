import jwt from 'jsonwebtoken'
import 'dotenv/config'
import express, { Express, Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import multer from 'multer'
import { EmbeddingService } from '@src/ai/embedding/services/embedding.service'
import { verifySupabaseToken } from '@src/supabase/middlewares/verify-auth-token.middlware'
import type {} from './types/express'
import { ChatRequestSchema } from '@src/types'
import { SupabaseDb } from '@src/supabase/client/supabase'
import * as process from 'node:process'
import { EmbedKnowledgeBaseAction } from '@src/knowledge-base/actions/embed-knowledge-base.action'
import { GeneratePublicLinkAction } from '@src/knowledge-base/actions/generate-public-link.action'
import { ChatPublicAction } from '@src/conversation/actions/public/chat-public.action'

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

app.post('/v1/knowledge-bases/embed', verifySupabaseToken, multerUpload, async (req: Request, res: Response) => {
  const embedKnowledgeBaseAction = new EmbedKnowledgeBaseAction()
  await embedKnowledgeBaseAction.embed(req, res)
})

app.post('/v1/knowledge-bases/:id/public-links', verifySupabaseToken, async (req: Request, res: Response) => {
  const generatePublicLinkAction = new GeneratePublicLinkAction()
  await generatePublicLinkAction.generate(req, res)
})

app.post('/public/v1/chat/:id', async (req: Request, res: Response) => {
  const chatPublicAction = new ChatPublicAction()
  await chatPublicAction.chat(req, res)
})

app.post('v1/knowledge-bases/query', verifySupabaseToken, async (req: Request, res: Response) => {
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
