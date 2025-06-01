import { Request, Response, NextFunction } from 'express'
import { verifySupabaseToken } from '@src/supabase/middlewares/verify-auth-token.middlware'
import { UnauthorizedError } from '@src/core/errors'

declare module 'express' {
  interface Request {
    user?: {
      id: string
      sub: string
      email: string
    }
  }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await verifySupabaseToken(req, res, next)
  } catch (error: unknown) {
    console.error('Authentication error:', error)
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    next(new UnauthorizedError('Authentication failed'))
  }
}
