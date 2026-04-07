export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login (login page)
     * - /api/auth/* (NextAuth endpoints)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /images/*, /icons/* (static files)
     */
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
