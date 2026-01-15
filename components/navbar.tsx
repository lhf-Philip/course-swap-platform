import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import SignOutButton from "@/components/sign-out-button"
import FeedbackButton from "@/components/feedback-button"
import { UserCircle } from "lucide-react" // 引入 Icon

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="border-b bg-white sticky top-0 z-40 shadow-sm">
      <div className="flex h-16 items-center px-4 container mx-auto justify-between">
        <Link href="/" className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Swap 科平台
        </Link>
        
        <div className="flex items-center space-x-2 md:space-x-3">
          {user ? (
            <>
              {/* Profile Button */}
              <Link href="/profile">
                <Button variant="ghost" size="icon" className="text-gray-600 hover:text-blue-600">
                  <UserCircle size={24} />
                </Button>
              </Link>

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