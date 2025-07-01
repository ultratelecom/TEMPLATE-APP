import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-key'
)

export interface AuthUser {
  username: string
  role: string
}

export async function verifyAuth(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token.value, JWT_SECRET)
    
    return {
      username: payload.username as string,
      role: payload.role as string,
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return null
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await verifyAuth()
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}