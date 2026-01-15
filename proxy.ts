import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ⚠️ 注意：函數名稱必須是 proxy (不能是 middleware)
export async function proxy(request: NextRequest) {
  // 1. 檢查環境變數
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 2. 獲取用戶 Session
  const { data: { user } } = await supabase.auth.getUser()

  // 定義不需要保護的路徑
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                      request.nextUrl.pathname.startsWith('/auth')

  // A. 如果未登入且不是在登入頁 -> 踢回 /login
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // B. 如果已登入 -> 檢查 Onboarding
  if (user) {
    // 查詢 Profile 狀態
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_onboarded')
      .eq('id', user.id)
      .single()

    const isOnboardingPage = request.nextUrl.pathname.startsWith('/onboarding')

    // 情況 1: 還沒 Onboard，但不在 Onboard 頁面 -> 強制去 /onboarding
    if (profile && !profile.is_onboarded && !isOnboardingPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    // 情況 2: 已經 Onboard 了，還想去 /onboarding -> 踢回首頁 /
    if (profile && profile.is_onboarded && isOnboardingPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}