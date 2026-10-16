import { NextResponse, type NextRequest } from 'next/server'

// Gate the entire casino behind login. Anyone without a session cookie
// is sent to /login; logged-in users visiting /login go to the lobby.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLoggedIn = Boolean(request.cookies.get('userId')?.value)
  const isLoginPage = pathname === '/login' || pathname.startsWith('/login/')

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.next()
}

export const config = {
  // Skip Next internals, API routes and static assets (images, sounds, etc.)
  matcher: ['/((?!api|socket\\.io|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)'],
}
