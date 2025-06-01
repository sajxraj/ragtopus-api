import jwt from 'jsonwebtoken'
import { NextFunction, Request, Response } from 'express'

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || ''

interface SupabaseJWT {
  sub: string
  email?: string
  role?: string
  [key: string]: unknown
}

interface ExpressUser {
  id: string
  sub: string
  email?: string
  role?: string
  [key: string]: unknown
}

export function verifySupabaseToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No or invalid Authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET) as SupabaseJWT
    const user: ExpressUser = {
      id: decoded.sub, // Use sub as id since that's the user's unique identifier in Supabase
      sub: decoded.sub,
      email: decoded.email || '', // Ensure email is always set
      role: decoded.role,
    }
    req.user = user
    next()
  } catch (err) {
    const error = err as jwt.JsonWebTokenError
    console.error('Token verification failed:', error.message)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
