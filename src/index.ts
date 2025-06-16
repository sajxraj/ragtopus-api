import jwt from 'jsonwebtoken'
import 'dotenv/config'
import express, { Express, Request, Response } from 'express'
import * as process from 'node:process'
import { ChatPublicService } from '@src/conversation/services/chat-public.service'
import cors from 'cors'
import { errorHandler } from '@src/core/middleware/error-handler'
import conversationRoutes from '@src/conversation/routes'
import chatRoutes from '@src/chat/routes'
import knowledgeBaseRoutes from '@src/knowledge-base/routes'
import slackRoutes from '@src/slack/routes'

const app: Express = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Auth route for local testing
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

// Public routes
app.post('/public/v1/chat/:id', async (req: Request, res: Response) => {
  const chatPublicService = new ChatPublicService()
  await chatPublicService.chat(req, res)
})

app.post('/public/v1/chat/:id/stream', async (req: Request, res: Response) => {
  const chatPublicService = new ChatPublicService()
  await chatPublicService.streamedChat(req, res)
})

// API routes
app.use('/v1/conversations', conversationRoutes)
app.use('/v1/chats', chatRoutes)
app.use('/v1/knowledge-bases', knowledgeBaseRoutes)
app.use('/v1/slack', slackRoutes)

// Error handling - must be after all routes
app.use(errorHandler)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
