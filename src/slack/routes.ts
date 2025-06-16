import { Router } from 'express'
import { SlackService } from '@src/slack/services/slack.service'

const router = Router()
const slackService = new SlackService()

router.post('/command', async (req, res, next) => {
  try {
    console.log('Received Slack command:', req.body)

    const { user_id, channel_id, text, response_url, channel_name } = req.body

    if (!user_id || !channel_id) {
      console.error('Missing required fields:', { user_id, channel_id })
      return res.status(400).send('Missing required fields')
    }

    res.status(200).send({
      response_type: 'ephemeral',
      text: `Processing your request for the question "${text}"....`,
    })

    const response = await slackService.handleCommand(user_id, text, channel_id, channel_name)

    await fetch(response_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        response_type: 'in_channel',
        text: response,
      }),
    })
  } catch (error) {
    console.error('Error processing Slack command:', error)
    next(error)
  }
})

export default router
