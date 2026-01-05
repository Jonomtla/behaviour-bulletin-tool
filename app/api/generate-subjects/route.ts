import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const { trainerToolboxTitle, podcastTitle, upcomingTitle, archiveTitle } = await request.json()

    const client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    })

    const prompt = `You are helping create email subject lines and preview text for the "Behaviour Bulletin" - a weekly email newsletter from Animal Training Academy about animal training.

This week's content includes:
- Trainer's Toolbox: ${trainerToolboxTitle || 'Not specified'}
- Latest Podcast: ${podcastTitle || 'Not specified'}
- Upcoming/Archive Webinar: ${upcomingTitle || archiveTitle || 'Not specified'}

Generate 10 different subject line and preview text combinations. Each should:
1. Be engaging and make readers want to open the email
2. Reference the actual content (don't make up topics)
3. Subject lines should be 40-60 characters max
4. Preview text should be 50-90 characters
5. Use a mix of styles: curiosity-driven, benefit-focused, direct, and question-based
6. Avoid clickbait - be authentic to the educational nature of the content
7. Can include an emoji occasionally but not required

Return ONLY a JSON array with this exact format, no other text:
[
  {"subject": "Subject line here", "preview": "Preview text here"},
  {"subject": "Subject line here", "preview": "Preview text here"}
]`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse the JSON response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('Failed to parse subject lines')
    }

    const subjectLines = JSON.parse(jsonMatch[0])

    return NextResponse.json({ subjectLines })
  } catch (error) {
    console.error('Error generating subjects:', error)
    return NextResponse.json(
      { error: 'Failed to generate subject lines' },
      { status: 500 }
    )
  }
}
