import express, { Request, Response, NextFunction } from 'express'
import { SlackService } from '@src/slack/services/slack.service'

const router = express.Router()
const slackService = new SlackService()

router.post('/command', async (req: Request, res: Response, next: NextFunction) => {
  console.log('Received Slack command:', req.body)

  try {
    const { user_id, text, channel_id, channel_name } = req.body

    if (!user_id || !channel_id) {
      console.error('Missing required Slack fields:', { user_id, channel_id })
      return res.status(400).send('Missing required fields')
    }

    const response = await slackService.handleCommand(user_id, text || '', channel_id, channel_name || 'directmessage')
    console.log('Sending response to Slack:', response)

    // Slack requires a response within 3 seconds
    res.status(200).send(response)
  } catch (error) {
    console.error('Error processing Slack command:', error)
    next(error)
  }
})

export default router
