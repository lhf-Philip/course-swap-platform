import Navbar from "@/components/navbar"
import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import RequestCard from "@/components/request-card"
import Search from "@/components/search"

export const dynamic = 'force-dynamic'

// 定義 Props 類型
type SearchParams = Promise<{ q?: string }>

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 關鍵修正：必須 await searchParams
  const params = await searchParams
  const query = params?.q?.toLowerCase() || ''

  // 1. 抓取所有 OPEN 請求
  const { data: requests, error } = await supabase
    .from('swap_requests')
    .select(`
      *,
      profiles:user_id (contact_method, contact_detail, email), 
      // 注意：不再需要查詢 course_sections，因為資料已經存入 JSONB
    `)
    .eq('status', 'OPEN')
    .order('created_at', { ascending: false })

  // 2. 搜尋過濾邏輯
  const filteredRequests = query && requests
    ? requests.filter((req: any) => {
        const haveCode = req.course_sections.course_code.toLowerCase()
        const wantCode = req.want_course_code.toLowerCase()
        return haveCode.includes(query) || wantCode.includes(query)
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests && filteredRequests.length > 0 ? (
            filteredRequests.map((req: any) => (
              <RequestCard 
                key={req.id} 
                request={req} 
                currentUserId={user?.id} 
              />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 space-y-4">
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