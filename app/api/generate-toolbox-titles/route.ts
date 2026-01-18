import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const { hook, blurb, cta } = await request.json()

    const client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    })

    const prompt = `You are helping create titles for the "Trainer's Toolbox" section of the Animal Training Academy's weekly email newsletter called "Behaviour Bulletin".

The title will appear as "Trainer's Toolbox: [TITLE]" in the email.

Here's the content for this week's Trainer's Toolbox:

Hook/Question: ${hook}

Main Content: ${blurb}

Call to Action: ${cta || 'Not provided'}

Generate 10 different title options that:
1. Are concise (3-8 words ideally)
2. Capture the essence of the content
3. Are engaging and make readers want to learn more
4. Could also work as email subject lines
5. Mix different styles: benefit-focused, curiosity-driven, name-drop (if a trainer is mentioned), action-oriented
6. Avoid clickbait - be authentic to the educational nature

Examples of good titles:
- "Lisa Longo's 5 Core Training Objectives"
- "Consent-Based Training for Reluctant Animals"
- "Case Studies in Ethical Parrot Training"
- "When Touch Isn't an Option"

Return ONLY a JSON array of strings with the 10 titles, no other text:
["Title 1", "Title 2", "Title 3", ...]`

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
      throw new Error('Failed to parse titles')
    }

    const titles = JSON.parse(jsonMatch[0])

    return NextResponse.json({ titles })
  } catch (error) {
    console.error('Error generating toolbox titles:', error)
    return NextResponse.json(
      { error: 'Failed to generate toolbox titles' },
      { status: 500 }
    )
  }
}
