import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Space Fund Game",
  description: "Space mission management game with AI-powered mission prediction",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-space-ship.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-space-ship.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon-space-ship.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/icon-space-ship.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
