import './globals.css'
import type { Metadata } from 'next'
import Providers from './providers'
import Navbar from './components/Navbar'

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
      <body>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
