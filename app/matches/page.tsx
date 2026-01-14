import Navbar from "@/components/navbar"
import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import RequestCard from "@/components/request-card"
import { Separator } from "@/components/ui/separator" // 記得安裝 separator

// 強制動態渲染，確保每次進來都是最新匹配
export const dynamic = 'force-dynamic'

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>請先登入</p>
      </div>
    )
  }

  // 1. 抓取「我」所有的 OPEN 請求 (My Requests)
  // 我們需要知道我手上持有什麼 (Have)，以及我想要什麼 (Want)
  const { data: myRequests } = await supabase
    .from('swap_requests')
    .select(`
      *,
      course_sections:have_section_id (course_code, group)
    `)
    .eq('user_id', user.id)
    .eq('status', 'OPEN')

  // 2. 抓取市場上「別人」所有的 OPEN 請求 (Market Requests)
  const { data: marketRequests } = await supabase
    .from('swap_requests')
    .select(`
      *,
      profiles:user_id (contact_method, contact_detail),
      course_sections:have_section_id (
        course_code, group, type, day, time, venue
      )
    `)
    .neq('user_id', user.id) // 排除自己
    .eq('status', 'OPEN')

  // 3. 核心算法：尋找 Perfect Matches
  // 我們將匹配結果按「我的請求」分組
  const matchesMap = new Map()

  if (myRequests && marketRequests) {
    myRequests.forEach((myReq) => {
      const myHaveCode = myReq.course_sections.course_code
      const myHaveGroup = myReq.course_sections.group
      const myWantCode = myReq.want_course_code
      const myWantGroup = myReq.want_group

      // 在市場中尋找匹配
      const matched = marketRequests.filter((theirReq) => {
        const theirHaveCode = theirReq.course_sections.course_code
        const theirHaveGroup = theirReq.course_sections.group
        const theirWantCode = theirReq.want_course_code
        const theirWantGroup = theirReq.want_group

        // 條件 1: 他們有的 == 我想要的
        const condition1 = (theirHaveCode === myWantCode) && 
                           (myWantGroup === 'ANY' || myWantGroup === theirHaveGroup)

        // 條件 2: 他們想要的 == 我有的
        const condition2 = (theirWantCode === myHaveCode) && 
                           (theirWantGroup === 'ANY' || theirWantGroup === myHaveGroup)

        return condition1 && condition2
      })

      if (matched.length > 0) {
        matchesMap.set(myReq.id, matched)
      }
    })
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-2">🎯 智能匹配 (Perfect Matches)</h1>
        <p className="text-gray-500 mb-8">系統為您找到的雙向交換機會。</p>

        {myRequests && myRequests.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">您目前沒有任何 OPEN 的請求，無法進行匹配。</p>
            <Link href="/create-request">
              <Button>+ 建立請求</Button>
            </Link>
          </div>
        ) : matchesMap.size === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border shadow-sm">
            <h3 className="text-lg font-medium">暫時沒有完美匹配</h3>
            <p className="text-gray-500 mt-2">
              別灰心！當其他同學發布符合您需求的請求時，這裡會自動更新。
            </p>
            <div className="mt-6">
              <Link href="/">
                <Button variant="outline">瀏覽所有市場請求</Button>
              </Link>
            </div>
          </div>
        ) : (
          // 顯示匹配結果
          <div className="space-y-10">
            {myRequests?.map((myReq) => {
              const matches = matchesMap.get(myReq.id)
              if (!matches) return null

              return (
                <div key={myReq.id} className="bg-white p-6 rounded-xl border shadow-sm">
                  {/* Header: 告訴用戶這是針對哪個請求的匹配 */}
                  <div className="mb-4 border-b pb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      您的請求: 
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {myReq.course_sections.course_code} (Group {myReq.course_sections.group})
                      </span>
                      <span>👉 想要 {myReq.want_course_code}</span>
                    </h2>
                    <p className="text-green-600 font-medium mt-1">
                      ✅ 找到 {matches.length} 個完美匹配！
                    </p>
                  </div>

                  {/* Matches List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matches.map((matchReq: any) => (
                      <RequestCard 
                        key={matchReq.id} 
                        request={matchReq} 
                        currentUserId={user.id} 
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}