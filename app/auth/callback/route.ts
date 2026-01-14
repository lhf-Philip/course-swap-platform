import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    // ⚠️ 修正重點：必須加 await，否則 supabase 只是 Promise，導致 .auth 為 undefined
    const supabase = await createClient() 
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 驗證成功，跳轉回首頁 (或 next 指定的頁面)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 驗證失敗
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}