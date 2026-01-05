import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Behaviour Bulletin Tool',
  description: 'Email generation tool for Animal Training Academy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
