'use client'

import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh() // 清除緩存
    router.replace('/login') // 硬跳轉
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut}>
      登出
    </Button>
  )
}