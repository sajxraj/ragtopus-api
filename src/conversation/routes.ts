import { Router, Request, Response } from 'express'
import { ConversationService } from '@src/conversation/services/conversation.service'
import { authenticateUser } from '@src/core/middleware/auth'
import { UnauthorizedError } from '@src/core/errors'
import { ChatService } from '@src/chat/services/chat.service'

const router = Router()
const conversationService = new ConversationService()

router.get('/', authenticateUser, async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('User not authenticated')
  }
  const conversations = await conversationService.findAllByUserId(req.user.id)
  res.json(conversations)
})

router.get('/:conversationId', authenticateUser, async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('User not authenticated')
  }
  const conversation = await conversationService.findById(req.params.conversationId)

  if (conversation.user_id !== req.user.id) {
    throw new UnauthorizedError('You are not authorized to access this resource')
  }

  res.json(conversation)
})

router.delete('/:conversationId', authenticateUser, async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('User not authenticated')
  }
  const conversation = await conversationService.findById(req.params.conversationId)

  if (conversation.user_id !== req.user.id) {
    throw new UnauthorizedError('You are not authorized to perform this action')
  }

  await conversationService.deleteConversation(req.params.conversationId)
  res.status(204).send()
})

router.get('/:conversationId/chats', authenticateUser, async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('User not authenticated')
  }

  const conversation = await conversationService.findById(req.params.conversationId)

  if (conversation.user_id !== req.user.id) {
    throw new UnauthorizedError('You are not authorized to access this resource')
  }

  const chatService = new ChatService()

  const chats = await chatService.findAllByConversationId(req.params.conversationId)
  res.json(chats)
})

export default router
