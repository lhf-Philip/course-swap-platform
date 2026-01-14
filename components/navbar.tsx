import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  async function signOut() {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/login")
  }

  return (
    <nav className="border-b bg-white">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <Link href="/" className="font-bold text-xl mr-6">
          Swap 科平台
        </Link>
        <div className="ml-auto flex items-center space-x-4">
          {user ? (
            <>
              <Link href="/matches">
                <Button variant="secondary" className="bg-green-100 hover:bg-green-200 text-green-800 border-green-200">
                  🎯 我的匹配
                </Button>
              </Link>
              <span className="text-sm text-gray-500">{user.email}</span>
              <form action={signOut}>
                <Button variant="outline" size="sm">登出</Button>
              </form>
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