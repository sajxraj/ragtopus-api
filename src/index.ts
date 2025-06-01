import jwt from 'jsonwebtoken'
import 'dotenv/config'
import express, { Express, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { verifySupabaseToken } from '@src/supabase/middlewares/verify-auth-token.middlware'
import type {} from '@src/types/express'
import * as process from 'node:process'
import { EmbedKnowledgeBaseAction } from '@src/knowledge-base/actions/embed-knowledge-base.action'
import { GeneratePublicLinkAction } from '@src/knowledge-base/actions/generate-public-link.action'
import { ChatPublicAction } from '@src/conversation/actions/public/chat-public.action'
import cors from 'cors'
import { errorHandler } from '@src/core/middleware/error-handler'
import conversationRoutes from '@src/conversation/routes'
import chatRoutes from '@src/chat/routes'

const app: Express = express()
const port = process.env.PORT || 3000

const storage = multer.memoryStorage()
const upload = multer({ storage })

app.use(cors())
app.use(express.json())

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

app.post('/public/v1/chat/:id/stream', async (req: Request, res: Response) => {
  const chatPublicAction = new ChatPublicAction()
  await chatPublicAction.streamedChat(req, res)
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

app.use('/v1/conversations', conversationRoutes)
app.use('/v1/chats', chatRoutes)

app.use(errorHandler)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
