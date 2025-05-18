// src/types/express/index.d.ts
import 'express'

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      sub: string
      email?: string
      role?: string
      [key: string]: unknown
    }
  }
}
