import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FitFirst - Interactive Fitness Tracker & Dashboard',
  description: 'A premium, glassmorphic fitness tracking dashboard for monitoring daily steps, active minutes, water intake, and logged workouts.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
