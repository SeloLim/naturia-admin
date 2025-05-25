import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Buat Supabase client yang bisa menangani cookies di middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is set, update the request headers and track the cookie
          // setting so that the response includes the set-cookie header.
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the request headers and track the cookie
          // removal so that the response includes the set-cookie header.
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
            headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )
  // Penting: Refresh sesi jika sudah kedaluwarsa/tidak valid
  // `getUser` akan otomatis merefresh token jika perlu
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Daftar route yang dilindungi (admin area)
  const protectedRoutes = ['/dashboard']
  // Route publik atau route auth (login)
  const authRoutes = ['/login'] // Tambahkan /register jika ada

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Logika Redirect:
  // 1. Jika user TIDAK login dan mencoba akses route terproteksi -> redirect ke login
  if (!user && isProtectedRoute) {
    console.log(`User not logged in, redirecting from ${pathname} to /login`);
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Jika user SUDAH login dan mencoba akses route auth (misal /login) -> redirect ke admin
  if (user && isAuthRoute) {
      console.log(`User logged in, redirecting from ${pathname} to /admin`);
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Jika tidak ada kondisi redirect yang terpenuhi, lanjutkan ke halaman tujuan
  return response
}

// Konfigurasi matcher untuk menentukan route mana yang akan menjalankan middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (jika Anda punya folder /public/images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
}