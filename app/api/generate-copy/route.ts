import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const { type, content } = await request.json()

    const client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    })

    if (type === 'subjects') {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `You're helping write the weekly "Behaviour Bulletin" email for Animal Training Academy.

Based on this content, generate:
1. Five subject line options (engaging, under 50 chars, curiosity-driven)
2. Five preview text options (the text that shows after subject in inbox, complements but doesn't repeat subject)

Content:
${content}

Respond with ONLY JSON, no markdown:
{"subjectLines": ["line1", "line2", "line3", "line4", "line5"], "previewTexts": ["preview1", "preview2", "preview3", "preview4", "preview5"]}`
        }]
      })

      const text = message.content[0].type === 'text' ? message.content[0].text : ''
      const data = JSON.parse(text.trim())
      return NextResponse.json(data)

    } else if (type === 'synopsis') {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: `Shorten this webinar synopsis for an email newsletter. Keep it to 2-3 sentences max, engaging and benefit-focused. Keep the presenter's name.

Original:
${content}

Respond with ONLY the shortened text, nothing else.`
        }]
      })

      const text = message.content[0].type === 'text' ? message.content[0].text : ''
      return NextResponse.json({ shortenedSynopsis: text.trim() })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: `Failed: ${error}` }, { status: 500 })
  }
}
