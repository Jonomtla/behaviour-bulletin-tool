import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  const correctPassword = process.env.APP_PASSWORD

  if (password === correctPassword) {
    const response = NextResponse.json({ success: true })

    // Set a simple auth cookie (valid for 7 days)
    response.cookies.set('auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response
  }

  return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 })
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('auth')
  return response
}
