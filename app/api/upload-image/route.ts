import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    const { image, filename } = await request.json()

    // image is a base64 data URL like "data:image/png;base64,..."
    const base64Data = image.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Get content type from data URL
    const contentType = image.split(';')[0].split(':')[1] || 'image/png'

    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${filename || 'image.png'}`

    // Upload to Vercel Blob
    const blob = await put(uniqueFilename, buffer, {
      access: 'public',
      contentType
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
