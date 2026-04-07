'use client'

import { signIn } from 'next-auth/react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-800">GEO Query Generator</h1>
          <p className="text-sm text-gray-500 text-center">
            กรุณาเข้าสู่ระบบด้วยบัญชี Azure AD ขององค์กร
          </p>
        </div>

        <button
          onClick={() => signIn('azure-ad', { callbackUrl: '/' })}
          className="w-full flex items-center justify-center gap-3 bg-[#0078d4] hover:bg-[#106ebe] text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
        >
          <MicrosoftIcon />
          เข้าสู่ระบบด้วย Microsoft
        </button>

        <p className="text-xs text-gray-400 text-center">
          SO Outsource · Siamrajathanee Public Company Limited
        </p>
      </div>
    </div>
  )
}

function MicrosoftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}
