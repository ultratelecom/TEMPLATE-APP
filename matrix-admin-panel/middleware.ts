import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-key'
)

export async function middleware(request: NextRequest) {
  // Only apply middleware to dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth-token')

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      await jwtVerify(token.value, JWT_SECRET)
      return NextResponse.next()
    } catch (error) {
      console.error('Token verification failed:', error)
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redirect logged-in users away from login page
  if (request.nextUrl.pathname === '/login') {
    const token = request.cookies.get('auth-token')

    if (token) {
      try {
        await jwtVerify(token.value, JWT_SECRET)
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } catch (error) {
        // Invalid token, allow access to login
        return NextResponse.next()
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
}