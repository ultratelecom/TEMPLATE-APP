import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { requireAuth } from '@/lib/auth'

interface CreateUserRequest {
  username: string
  password: string
  displayName?: string
  admin?: boolean
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    await requireAuth()

    const { username, password, displayName, admin }: CreateUserRequest = await request.json()

    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Get Matrix admin configuration from environment
    const matrixAdminToken = process.env.MATRIX_ADMIN_TOKEN
    const matrixApiUrl = process.env.MATRIX_ADMIN_API_URL

    if (!matrixAdminToken || !matrixApiUrl) {
      return NextResponse.json(
        { error: 'Matrix server configuration not found' },
        { status: 500 }
      )
    }

    // Extract localpart from full Matrix ID (remove @ and domain)
    let localpart = username
    if (username.startsWith('@')) {
      localpart = username.split(':')[0].substring(1)
    }

    // Prepare Matrix user creation payload
    const matrixUserData = {
      password,
      admin: admin || false,
      ...(displayName && { displayname: displayName }),
    }

    // Make request to Matrix admin API
    const matrixResponse = await axios.put(
      `${matrixApiUrl}/_synapse/admin/v2/users/@${localpart}:${new URL(matrixApiUrl).hostname}`,
      matrixUserData,
      {
        headers: {
          'Authorization': `Bearer ${matrixAdminToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    )

    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        name: matrixResponse.data.name,
        displayname: matrixResponse.data.displayname,
        admin: matrixResponse.data.admin,
        creation_ts: matrixResponse.data.creation_ts,
      },
    })

  } catch (error: any) {
    console.error('User creation error:', error)

    // Handle specific Matrix API errors
    if (error.response?.status === 400) {
      return NextResponse.json(
        { error: 'Invalid user data or user already exists' },
        { status: 400 }
      )
    }

    if (error.response?.status === 401) {
      return NextResponse.json(
        { error: 'Matrix admin token is invalid' },
        { status: 500 }
      )
    }

    if (error.response?.status === 403) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create user' },
        { status: 500 }
      )
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { error: 'Cannot connect to Matrix server' },
        { status: 500 }
      )
    }

    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Generic error response
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}