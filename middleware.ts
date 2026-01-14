import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 1. 初始化 Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 2. 獲取用戶 Session
  const { data: { user } } = await supabase.auth.getUser()

  // 定義不需要保護的路由
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                      request.nextUrl.pathname.startsWith('/auth') ||
                      request.nextUrl.pathname.startsWith('/check-email')

  // 如果未登入且不是在登入相關頁面 -> 踢回 /login
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 如果已登入
  if (user) {
    // 3. 檢查 Onboarding 狀態
    // 從 DB 查詢 profiles 表
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_onboarded')
      .eq('id', user.id)
      .single()

    const isOnboardingPage = request.nextUrl.pathname.startsWith('/onboarding')

    // 邏輯：如果沒 Onboarded 且不在 /onboarding 頁面 -> 強制去 /onboarding
    if (profile && !profile.is_onboarded && !isOnboardingPage) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // 邏輯：如果已經 Onboarded 了，還想去 /onboarding -> 踢回首頁 (可選)
    if (profile && profile.is_onboarded && isOnboardingPage) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * 匹配所有路徑，除了:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}