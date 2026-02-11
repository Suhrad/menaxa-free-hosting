import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import EmailCaptureToast from './components/EmailCaptureToast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Menaxa | Your Threat Command Center',
  description: 'Comprehensive threat intelligence monitoring platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-M9MCP55DMH"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-M9MCP55DMH');
          `,
        }} />
        <link rel="icon" href="/favicon.png" type="image/png" />
         {/* SEO Meta Tags */}
  <meta name="robots" content="index, follow" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="keywords" content="Web3 security, threat intelligence, Menaxa, blockchain hacks, smart contract auditing, DeFi vulnerabilities, crypto threats, DeFi monitoring, blockchain security platform" />
  <meta name="author" content="Menaxa Team" />

  {/* Open Graph / Facebook */}
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://menaxa.xyz/" />
  <meta property="og:title" content="Menaxa | Your Threat Command Center" />
  <meta property="og:description" content="Comprehensive threat intelligence monitoring platform." />
  <meta property="og:image" content="https://menaxa.xyz/Menaxa.png" />

  {/* Twitter Card */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://menaxa.xyz/" />
  <meta name="twitter:title" content="Menaxa | Your Threat Command Center" />
  <meta name="twitter:description" content="Track hacks, vulnerabilities, and threats in using Menaxa." />
  <meta name="twitter:image" content="https://menaxa.xyz/Menaxa.png" />

      </head>
      <body className={`${inter.className} min-h-screen bg-black text-gray-100`}>
        <EmailCaptureToast />
        {children}
      </body>
    </html>
  )
} 