import 'dotenv/config'
import express, { Express, Request, Response } from 'express'
import bodyParser from 'body-parser'
import { EmbeddingService } from '@src/ai/embedding/services/embedding.service'

const app: Express = express()
const port = process.env.PORT || 3000

app.use(bodyParser.json())

app.get('/', (_req: Request, res: Response) => {
  res.send({
    message: 'Server is working perfectly!',
  })
})

app.post('/embed', async (req: Request, res: Response) => {
  const url = req.body.url
  const embeddingService = new EmbeddingService()
  await embeddingService.generateEmbedding(url)

  res.send({
    message: 'Successfully added to the knowledge base',
  })
})

app.post('/query', async (req: Request, res: Response) => {
  try {
    const { query } = req.body

    const embeddingService = new EmbeddingService()
    const result = await embeddingService.handleQuery(query)

    res.status(200).json(result)
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: 'Error occurred',
    })
  }
})

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`)
})
