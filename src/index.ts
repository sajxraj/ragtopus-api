import jwt from 'jsonwebtoken'
import 'dotenv/config'
import express, { Express, Request, Response } from 'express'
import bodyParser from 'body-parser'
import { EmbeddingService } from '@src/ai/embedding/services/embedding.service'
import { verifySupabaseToken } from '@src/supabase/middlewares/verify-auth-token.middlware'
import type {} from './types/express'
import { EmbeddingRequestSchema } from '@src/types'
import { SupabaseDb } from '@src/supabase/client/supabase'

const app: Express = express()
const port = process.env.PORT || 3000

app.use(bodyParser.json())

app.get('/', (_req: Request, res: Response) => {
  res.send({
    message: 'Server is working perfectly!',
  })
})

app.post('/embed', verifySupabaseToken, async (req: Request, res: Response) => {
  const db = SupabaseDb.getInstance()
  const knowledgeBase = await db.from('knowledge_bases').select('id, user_id').eq('name', req.body.knowledgeBaseId).single()

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

  const body = EmbeddingRequestSchema.parse(req.body)
  const embeddingService = new EmbeddingService()
  await embeddingService.generateEmbedding(body)

  res.send({
    message: 'Successfully added to the knowledge base',
  })
})

app.post('/query', verifySupabaseToken, async (req: Request, res: Response) => {
  try {
    const { query } = req.body

    const embeddingService = new EmbeddingService()
    const result = await embeddingService.handleQuery(query)

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
