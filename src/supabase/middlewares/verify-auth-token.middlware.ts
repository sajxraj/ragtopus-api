import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || ''

interface SupabaseJWT {
  sub: string
  email?: string
  role?: string
  [key: string]: unknown // or a specific type if known
}

export function verifySupabaseToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No or invalid Authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET) as SupabaseJWT
    req.user = decoded
    next()
  } catch (err) {
    const error = err as jwt.JsonWebTokenError
    console.error('Token verification failed:', error.message)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
