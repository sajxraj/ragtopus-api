import { Request, Response, NextFunction } from 'express'
import { UnauthorizedError } from '@src/core/errors'
import { NotFoundError } from '@src/core/errors/not-found.error'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: Error, req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof UnauthorizedError) {
    return res.status(401).json({ message: error.message })
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({ message: error.message })
  }

  console.error('Error:', error)
  return res.status(500).json({ message: error.message || 'An unexpected error occurred' })
}
