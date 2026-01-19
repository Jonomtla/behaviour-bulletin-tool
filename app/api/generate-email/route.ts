import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    const client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    })

    const prompt = `You are helping create the weekly "Behaviour Bulletin" email newsletter for Animal Training Academy.

The user will paste raw content that includes some or all of:
- Trainer's Toolbox: A blog post/tip with hook, blurb, link, and CTA
- Previous Webinar: Title and links (member/non-member)
- Podcast: Latest episode title
- Upcoming Webinar OR Archive Webinar: Title, synopsis, and links

Your job is to:
1. Parse and understand the content
2. Generate 5 subject line options with preview text
3. Generate the full email HTML

Here's the raw content from the user:

${content}

---

Please respond with ONLY valid JSON in this exact format (no markdown, no code blocks, just JSON):

{
  "subjectLines": [
    {"subject": "Subject line 1", "preview": "Preview text that appears after subject in inbox"},
    {"subject": "Subject line 2", "preview": "Preview text 2"},
    {"subject": "Subject line 3", "preview": "Preview text 3"},
    {"subject": "Subject line 4", "preview": "Preview text 4"},
    {"subject": "Subject line 5", "preview": "Preview text 5"}
  ],
  "emailHtml": "<full email HTML here>"
}

For subject lines:
- Make them engaging and curiosity-driven
- Reference the main content (Trainer's Toolbox topic, podcast guest, webinar topic)
- Keep under 50 characters ideally
- Preview text should complement (not repeat) the subject

For the email HTML:
- Use inline CSS for email compatibility
- Use the ATA green color: #589B36
- Structure: Header → Trainer's Toolbox → "In case you missed it" (webinar + podcast side by side) → Upcoming/Archive webinar → Sign-off from Ryan Cartlidge
- Use tables for layout (email-safe)
- Make buttons with background #589B36 for primary, #666 for secondary
- Keep it clean and professional
- Add UTM parameters to links: ?utm_campaign=behavior-bulletin&utm_medium=email&utm_source=kit
- If podcast image URL isn't provided, skip the image
- If any section is missing from the input, skip that section gracefully`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON response
    try {
      // Try to extract JSON if wrapped in anything
      let jsonStr = responseText.trim()

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      const data = JSON.parse(jsonStr)
      return NextResponse.json(data)
    } catch (parseError) {
      console.error('Failed to parse response:', responseText)
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error generating email:', error)
    return NextResponse.json(
      { error: `Failed to generate email: ${error}` },
      { status: 500 }
    )
  }
}
