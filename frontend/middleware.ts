import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Browser ke cookies se token check karein
  const token = request.cookies.get('token')?.value

  // Agar user main dashboard (/) par jane ki koshish kare aur token na ho
  if (!token && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/signup', request.url))
  }

  // Agar user logged in hai aur login/signup page par jana chahe, toh home bhej dein
  if (token && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// Kin pages par ye rule apply hoga
export const config = {
  matcher: ['/', '/login', '/signup'],
}