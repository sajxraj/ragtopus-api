import { Request, Response, NextFunction } from 'express'
import { UnauthorizedError } from '../errors'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err)

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({ error: err.message })
  }

  // Handle other types of errors
  res.status(500).json({ error: 'Internal server error' })
}
