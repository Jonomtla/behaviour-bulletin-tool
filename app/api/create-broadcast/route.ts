import { NextRequest, NextResponse } from 'next/server'

interface BroadcastData {
  subject: string
  previewText: string
  htmlContent: string
  sendAt?: string | null
}

async function createKitBroadcast(data: BroadcastData) {
  const apiKey = process.env.KIT_API_KEY

  const response = await fetch('https://api.kit.com/v4/broadcasts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kit-Api-Key': apiKey || ''
    },
    body: JSON.stringify({
      subject: data.subject,
      preview_text: data.previewText,
      content: data.htmlContent,
      public: false,
      send_at: data.sendAt || null
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Kit API error:', errorText)
    throw new Error(`Kit API error: ${response.status}`)
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberEmail, nonMemberEmail, subject, previewText, scheduledDate } = body

    // Calculate send time (8am on the scheduled date)
    let sendAt: string | null = null
    if (scheduledDate) {
      const date = new Date(scheduledDate)
      date.setHours(8, 0, 0, 0)
      sendAt = date.toISOString()
    }

    const results: { member?: unknown; nonMember?: unknown; errors: string[] } = { errors: [] }

    // Create member broadcast
    try {
      const memberResult = await createKitBroadcast({
        subject: `[Members] ${subject}`,
        previewText,
        htmlContent: memberEmail,
        sendAt
      })
      results.member = memberResult
    } catch (error) {
      results.errors.push(`Member broadcast failed: ${error}`)
    }

    // Create non-member broadcast
    try {
      const nonMemberResult = await createKitBroadcast({
        subject: `[Non-Members] ${subject}`,
        previewText,
        htmlContent: nonMemberEmail,
        sendAt
      })
      results.nonMember = nonMemberResult
    } catch (error) {
      results.errors.push(`Non-member broadcast failed: ${error}`)
    }

    if (results.errors.length === 2) {
      return NextResponse.json({ error: results.errors.join('; ') }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Broadcasts created as drafts in Kit',
      results
    })
  } catch (error) {
    console.error('Error creating broadcasts:', error)
    return NextResponse.json(
      { error: 'Failed to create broadcasts' },
      { status: 500 }
    )
  }
}
