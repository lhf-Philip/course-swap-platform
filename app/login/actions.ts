'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function loginWithMicrosoft() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: `${origin}/auth/callback`,
      scopes: 'email profile openid',
      // 關鍵修正：加入這行，強制每次都要選帳號/輸入密碼
      queryParams: { prompt: 'login' }, 
    },
  })

  if (error) {
    console.error(error)
    redirect('/error')
  }

  if (data.url) {
    redirect(data.url)
  }
}