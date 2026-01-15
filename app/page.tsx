import Navbar from "@/components/navbar"
import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import RequestCard from "@/components/request-card"
import Search from "@/components/search"

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ q?: string }>

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const params = await searchParams
  const query = params?.q?.toLowerCase() || ''

  // 1. 抓取所有請求 (包含新的 JSONB 欄位)
  const { data: requests } = await supabase
    .from('swap_requests')
    .select(`
      *,
      profiles:user_id (contact_method, contact_detail, email)
    `)
    .eq('status', 'OPEN')
    .order('created_at', { ascending: false })

  // 2. 搜尋過濾邏輯 (針對 JSONB 結構進行搜尋)
  const filteredRequests = query && requests
    ? requests.filter((req: any) => {
        // 搜尋 Have 裡面的 Code
        const matchHave = req.have_details?.some((h: any) => 
          h.code.toLowerCase().includes(query)
        )
        // 搜尋 Want 裡面的 Code
        const matchWant = req.wants?.some((w: any) => 
          w.code.toLowerCase().includes(query)
        )
        return matchHave || matchWant
      })
    : requests

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto py-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">Swap 市場</h1>
          
          <div className="flex w-full md:w-auto gap-2">
            <Search />
            <Link href="/create-request">
              <Button>+ 建立交換請求</Button>
            </Link>
          </div>
        </div>

        {/* 
           === 關鍵修改：瀑布流布局 (Masonry Layout) === 
           使用 columns-1 (手機) -> columns-2 (平板) -> columns-3 (桌面)
           space-y-6: 控制垂直間距
        */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {filteredRequests && filteredRequests.length > 0 ? (
            filteredRequests.map((req: any) => (
              // break-inside-avoid 是關鍵：防止卡片被切斷在兩列之間
              <div key={req.id} className="break-inside-avoid">
                <RequestCard 
                  request={req} 
                  currentUserId={user?.id} 
                />
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 space-y-4 text-center">
              <p className="text-lg">
                {query ? `找不到包含 "${query}" 的請求` : "目前沒有任何交換請求"}
              </p>
              <Link href="/create-request">
                <Button variant="outline">成為第一個發布者</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}