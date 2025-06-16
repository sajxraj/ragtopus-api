import express, { Request, Response } from 'express'
import { SlackService } from '@src/slack/services/slack.service'

const router = express.Router()
const slackService = new SlackService()

router.post('/command', async (req: Request, res: Response) => {
  const { user_id, text, channel_id, channel_name } = req.body
  const response = await slackService.handleCommand(user_id, text, channel_id, channel_name)
  res.send(response)
})

export default router
