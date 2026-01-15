import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // 1. 檢查環境變數，如果沒有就報錯 (避免 500 讓整個網站掛掉)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Middleware Error: Missing Supabase Environment Variables')
    // 這裡我們暫時放行，讓頁面顯示錯誤，而不是讓 Middleware 崩潰
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // 2. 初始化 Client (注意：這裡是 Middleware 專用的寫法，不依賴 utils)
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

    // 3. 獲取用戶 Session
    // supabase.auth.getUser() 比 getSession() 更安全
    const { data: { user } } = await supabase.auth.getUser()

    // 4. 定義路由保護邏輯
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                        request.nextUrl.pathname.startsWith('/auth')

    // 未登入 -> 踢回 login
    if (!user && !isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // 已登入 -> 檢查 Onboarding
    if (user) {
      // 避免在檢查 onboarding 時卡死，我們簡單查詢
      // 注意：在 Middleware 查 DB 會增加延遲，這部分如果有問題可以先註解掉
      /* 
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_onboarded')
        .eq('id', user.id)
        .single()

      const isOnboardingPage = request.nextUrl.pathname.startsWith('/onboarding')

      if (profile && !profile.is_onboarded && !isOnboardingPage) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      
      if (profile && profile.is_onboarded && isOnboardingPage) {
        return NextResponse.redirect(new URL('/', request.url))
      }
      */
    }

    return response

  } catch (e) {
    // 如果出錯，記錄錯誤但不讓網站崩潰
    console.error('Middleware Error:', e)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}