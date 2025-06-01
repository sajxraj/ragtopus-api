import { Router, Request, Response } from 'express'
import { ChatService } from '@src/chat/services/chat.service'
import { authenticateUser } from '@src/core/middleware/auth'
import { UnauthorizedError } from '@src/core/errors'
import { validateRequest } from '@src/core/middleware/validation'
import { chatRequestSchema } from '@src/chat/schemas/chat-request.schema'

const router = Router()
const chatService = new ChatService()

router.post('/stream', authenticateUser, validateRequest(chatRequestSchema), async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Transfer-Encoding', 'chunked')

  if (res.socket) {
    res.socket.setNoDelay(true)
    res.socket.setTimeout(0)
  }

  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated')
    }

    await chatService.streamText(req.body, res, req.user)
  } catch (error) {
    console.error('Error occurred during streaming:', error)
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`)
      res.end()
    }
  }
})

export default router
