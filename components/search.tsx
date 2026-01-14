'use client'

import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams } from "next/navigation"
import { useDebouncedCallback } from "use-debounce"

export default function Search() {
  const searchParams = useSearchParams()
  const { replace } = useRouter()

  // 防抖動：用戶停止打字 300ms 後才執行搜尋，避免一直刷新
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    replace(`/?${params.toString()}`)
  }, 300)

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <Input
        className="w-full md:w-[300px]"
        placeholder="搜尋科目編號 (e.g. BHMH)..."
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('q')?.toString()}
      />
    </div>
  )
}