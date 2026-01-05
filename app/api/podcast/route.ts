import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const rssUrl = 'https://rss.libsyn.com/shows/151994/destinations/981521.xml'
    const response = await fetch(rssUrl)
    const xmlText = await response.text()

    // Simple XML parsing for the first item
    const itemMatch = xmlText.match(/<item>([\s\S]*?)<\/item>/)
    if (!itemMatch) {
      return NextResponse.json({ error: 'No episodes found' }, { status: 404 })
    }

    const itemXml = itemMatch[1]

    // Extract title
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                       itemXml.match(/<title>(.*?)<\/title>/)
    const title = titleMatch ? titleMatch[1] : 'Unknown Title'

    // Extract publication date
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)
    const pubDate = pubDateMatch ? pubDateMatch[1] : ''

    // Extract description
    const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
                      itemXml.match(/<description>(.*?)<\/description>/)
    let description = descMatch ? descMatch[1] : ''
    // Clean HTML tags from description
    description = description.replace(/<[^>]*>/g, '').trim()

    // Extract iTunes image (episode-specific)
    const imageMatch = itemXml.match(/<itunes:image\s+href="([^"]+)"/)
    const image = imageMatch ? imageMatch[1] : ''

    // Extract link
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/)
    const link = linkMatch ? linkMatch[1] : ''

    // Format date
    const formattedDate = pubDate ? new Date(pubDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : ''

    return NextResponse.json({
      title,
      date: formattedDate,
      description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
      image,
      link
    })
  } catch (error) {
    console.error('Error fetching podcast:', error)
    return NextResponse.json({ error: 'Failed to fetch podcast' }, { status: 500 })
  }
}
