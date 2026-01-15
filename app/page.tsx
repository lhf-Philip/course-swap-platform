import Navbar from "@/components/navbar"
import { createClient } from "@/utils/supabase/server"
import MarketPlace from "@/components/market-place"

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. 一次抓取所有 OPEN 請求
  const { data: requests } = await supabase
    .from('swap_requests')
    .select(`
      *,
      profiles:user_id (contact_method, contact_detail, email)
    `)
    .eq('status', 'OPEN')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto py-10 px-4">
        {/* 將搜尋與顯示邏輯交給 Client Component */}
        <MarketPlace 
          initialRequests={requests || []} 
          currentUserId={user?.id} 
        />
      </div>
    </main>
  )
}