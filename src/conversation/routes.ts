import { Router, Request, Response, NextFunction } from 'express'
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
  const conversation = await conversationService.checkAccess(req.params.conversationId, req.user.id)
  const c = conversation
  res.json(c)
})

router.delete('/:conversationId', authenticateUser, async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('User not authenticated')
  }
  await conversationService.checkAccess(req.params.conversationId, req.user.id)
  await conversationService.deleteConversation(req.params.conversationId)
  res.status(204).send()
})

router.get('/:conversationId/chats', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated')
    }
    await conversationService.checkAccess(req.params.conversationId, req.user.id)
    const chatService = new ChatService()

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))

    const chats = await chatService.findPaginatedByConversationId(req.params.conversationId, page, limit)
    res.json(chats)
  } catch (error) {
    console.error('Error fetching chats:', error)
    next(error)
  }
})

export default router
