'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function loginWithMicrosoft() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure', // Supabase 對應 Microsoft 的代號是 azure
    options: {
      redirectTo: `${origin}/auth/callback`,
      scopes: 'email profile openid', // 請求基本權限
    },
  })

  if (error) {
    console.error(error)
    redirect('/error')
  }

  if (data.url) {
    redirect(data.url) // 自動跳轉去 Microsoft 登入頁面
  }
}