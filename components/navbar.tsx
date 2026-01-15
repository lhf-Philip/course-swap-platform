import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import SignOutButton from "@/components/sign-out-button" // 確保引用了這個
import FeedbackButton from "@/components/feedback-button"

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="border-b bg-white sticky top-0 z-40">
      <div className="flex h-16 items-center px-4 container mx-auto justify-between">
        <Link href="/" className="font-bold text-xl">
          Swap 科平台
        </Link>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          {user ? (
            <>
              <Link href="/matches" className="hidden md:block">
                <Button variant="secondary" className="bg-green-100 hover:bg-green-200 text-green-800 border-green-200">
                  🎯 我的匹配
                </Button>
              </Link>
              
              <span className="text-sm text-gray-500 hidden md:inline">{user.email}</span>
              
              {/* 這裡只放按鈕組件，不寫邏輯 */}
              <FeedbackButton />
              <SignOutButton />
            </>
          ) : (
            <Link href="/login">
              <Button>登入</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}