import express, { Express, Request, Response } from 'express'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app: Express = express()
const port = process.env.PORT || 3000

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

app.get('/', (_req: Request, res: Response) => {
  res.send({
    message: 'Server is working perfectly!',
  })
})

app.post('/embed', async (_req: Request, res: Response) => {
  res.send({
    data: {}
  })
})

app.post('/query', async (_req: Request, res: Response) => {
  res.send({
    data: {}
  })
})

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`)
})
