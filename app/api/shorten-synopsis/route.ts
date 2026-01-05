import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const { synopsis, title } = await request.json()

    const client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    })

    const prompt = `Shorten this webinar synopsis to approximately 2-3 sentences (50-80 words max) while keeping the key information and making it engaging. The webinar is titled "${title}".

Original synopsis:
${synopsis}

Write it in a style that:
- Addresses the reader directly where appropriate
- Highlights what they'll learn or gain
- Maintains a professional but warm tone
- Ends with something that encourages them to watch/attend

Return ONLY the shortened synopsis, no other text or explanation.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    const shortenedSynopsis = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    return NextResponse.json({ shortenedSynopsis })
  } catch (error) {
    console.error('Error shortening synopsis:', error)
    return NextResponse.json(
      { error: 'Failed to shorten synopsis' },
      { status: 500 }
    )
  }
}
