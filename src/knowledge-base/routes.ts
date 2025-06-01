import { Router, Request, Response, NextFunction } from 'express'
import { EmbedKnowledgeBaseAction } from '@src/knowledge-base/actions/embed-knowledge-base.action'
import { GeneratePublicLinkAction } from '@src/knowledge-base/actions/generate-public-link.action'
import { verifySupabaseToken } from '@src/supabase/middlewares/verify-auth-token.middlware'
import multer from 'multer'

const router = Router()
const storage = multer.memoryStorage()
const upload = multer({ storage })

const multerUpload = upload.single('file') as unknown as (req: Request, res: Response, next: NextFunction) => void

router.post('/embed', verifySupabaseToken, multerUpload, async (req, res) => {
  const embedKnowledgeBaseAction = new EmbedKnowledgeBaseAction()
  await embedKnowledgeBaseAction.embed(req, res)
})

router.post('/:id/public-links', verifySupabaseToken, async (req, res) => {
  const generatePublicLinkAction = new GeneratePublicLinkAction()
  await generatePublicLinkAction.generate(req, res)
})

export default router
