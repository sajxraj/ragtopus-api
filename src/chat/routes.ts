import { Router, Request, Response } from 'express'
import { ChatService } from '@src/chat/services/chat.service'
import { ConversationService } from '@src/conversation/services/conversation.service'
import { authenticateUser } from '@src/core/middleware/auth'
import { UnauthorizedError } from '@src/core/errors'
import { validateRequest } from '@src/core/middleware/validation'
import { chatRequestSchema } from '@src/chat/schemas/chat-request.schema'

const router = Router()
const chatService = new ChatService()
const conversationService = new ConversationService()

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

    console.log('Starting stream request with user:', req.user)
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

router.get('/conversations/:conversationId/chats', authenticateUser, async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('User not authenticated')
  }

  const conversation = await conversationService.findById(req.params.conversationId)

  if (conversation.userId !== req.user.id) {
    throw new UnauthorizedError('You are not authorized to access this resource')
  }

  const chats = await chatService.findAllByConversationId(req.params.conversationId)
  res.json(chats)
})

export default router
