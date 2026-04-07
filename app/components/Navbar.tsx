'use client'

import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import { useState } from 'react'

export default function Navbar() {
  const { data: session } = useSession()
  const [imgError, setImgError] = useState(false)

  if (!session) return null

  const { name, email, image } = session.user ?? {}
  const initials = name
    ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : email?.[0]?.toUpperCase() ?? '?'

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span className="text-gray-400 text-sm font-medium">GEO Query Generator</span>

        <div className="flex items-center gap-3">
          {/* Profile picture */}
          {image && !imgError ? (
            <Image
              src={image}
              alt={name ?? 'User'}
              width={36}
              height={36}
              className="rounded-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold text-white select-none">
              {initials}
            </div>
          )}

          {/* User info */}
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-medium text-gray-100">{name}</span>
            <span className="text-xs text-gray-400">{email}</span>
          </div>

          {/* Logout button */}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <LogoutIcon />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </nav>
  )
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
