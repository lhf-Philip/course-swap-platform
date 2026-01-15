'use client'

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search as SearchIcon } from "lucide-react"
import Link from "next/link"
import RequestCard from "@/components/request-card"

type MarketPlaceProps = {
  initialRequests: any[]
  currentUserId: string | undefined
}

export default function MarketPlace({ initialRequests, currentUserId }: MarketPlaceProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // === 核心邏輯：即時過濾 ===
  // 使用 useMemo 優化效能，只有當 query 或 requests 變動時才重新計算
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return initialRequests

    const lowerQuery = searchQuery.toLowerCase()

    return initialRequests.filter((req) => {
      // 1. 搜尋 Have Code & Group
      const haveMatch = req.have_details?.some((h: any) => 
        h.code.toLowerCase().includes(lowerQuery) || 
        h.group.toLowerCase().includes(lowerQuery)
      )

      // 2. 搜尋 Want Code & Groups
      const wantMatch = req.wants?.some((w: any) => 
        w.code.toLowerCase().includes(lowerQuery) ||
        w.groups?.some((g: string) => g.toLowerCase().includes(lowerQuery))
      )

      // 3. 搜尋 Reward
      const rewardMatch = req.reward?.toLowerCase().includes(lowerQuery)

      return haveMatch || wantMatch || rewardMatch
    })
  }, [searchQuery, initialRequests])

  return (
    <div className="space-y-6">
      {/* 搜尋與操作欄 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 sticky top-20 z-30 bg-gray-50/95 backdrop-blur py-2">
        <h1 className="text-3xl font-bold text-gray-800">Swap 市場</h1>
        
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-[300px]">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜尋 Code, Class, Reward..."
              className="pl-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} // 即時更新 state
            />
          </div>
          
          <Link href="/create-request">
            <Button>+ 建立請求</Button>
          </Link>
        </div>
      </div>

      {/* 瀑布流顯示 */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 pb-20">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => (
            <div key={req.id} className="break-inside-avoid">
              <RequestCard 
                request={req} 
                currentUserId={currentUserId} 
              />
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-gray-500">
            <p className="text-lg">找不到符合 "{searchQuery}" 的結果</p>
          </div>
        )}
      </div>
    </div>
  )
}