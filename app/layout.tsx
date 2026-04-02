import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SO Outsource | บริการ Outsource ครบวงจรสำหรับองค์กร',
  description: 'บริการ Outsource ครบวงจร ช่วยองค์กรลดต้นทุน เพิ่มประสิทธิภาพ และเติบโตอย่างยั่งยืน',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
