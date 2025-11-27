import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { MainLayout } from '@/components/layout/main-layout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Touch Contents CRM',
  description: '콘텐츠 관리 시스템 - AI 기반 교육 콘텐츠 추천',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  )
}
