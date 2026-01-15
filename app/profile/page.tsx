import { createClient } from "@/utils/supabase/server"
import Navbar from "@/components/navbar"
import ProfileView from "@/components/profile-view"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 1. Fetch Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 2. Fetch User's Posts
  const { data: posts } = await supabase
    .from('swap_requests')
    .select(`*, profiles:user_id (contact_method, contact_detail, email)`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto py-10 px-4">
        <ProfileView profile={profile} posts={posts || []} />
      </div>
    </main>
  )
}