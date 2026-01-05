import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get('auth')

  if (authCookie?.value === 'authenticated') {
    return NextResponse.json({ authenticated: true })
  }

  return NextResponse.json({ authenticated: false }, { status: 401 })
}
