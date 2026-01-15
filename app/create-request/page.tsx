'use client'

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { X, Gem, Plus, Trash2, Tag } from "lucide-react"
import Link from "next/link"

// === Helper Component: Tag Input ===
interface TagInputProps {
  placeholder: string
  tags: string[]
  setTags: (tags: string[]) => void
  maxTags?: number // 限制數量 (Have 設為 1, Want 不限)
}

function TagInput({ placeholder, tags, setTags, maxTags }: TagInputProps) {
  const [input, setInput] = useState("")

  const addTag = () => {
    const val = input.trim().toUpperCase()
    if (!val) return
    if (tags.includes(val)) {
      setInput("") // 重複的清空但不報錯
      return
    }
    if (maxTags && tags.length >= maxTags) {
      // 如果限制 1 個，就替換掉舊的
      if (maxTags === 1) {
        setTags([val])
        setInput("")
        return
      }
      toast.error(`最多只能輸入 ${maxTags} 個`)
      return
    }
    setTags([...tags, val])
    setInput("")
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-slate-800 text-white text-sm px-2 py-1 rounded-md">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-red-400 ml-1"><X size={14}/></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input 
          placeholder={tags.length === maxTags ? "已達上限 (刪除後可重新輸入)" : placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          disabled={tags.length === maxTags && maxTags === 1} // 如果限制1個且已填，鎖住
        />
        <Button type="button" variant="secondary" onClick={addTag} disabled={!input}>
          <Plus size={18}/>
        </Button>
      </div>
    </div>
  )
}

// === Main Page ===

export default function CreateRequestPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Have Section (單選 Code, 單選 Group)
  const [haveCode, setHaveCode] = useState<string[]>([])
  const [haveGroup, setHaveGroup] = useState<string[]>([])

  // Want Section (List of {code, groups[]})
  // 這裡我們簡化：用戶輸入 "想要科目" 和 "想要班別"，然後按 "加入列表"
  const [tempWantCode, setTempWantCode] = useState<string[]>([])
  const [tempWantGroups, setTempWantGroups] = useState<string[]>([])
  
  // 最終存入 DB 的 Want List
  type WantItem = { code: string; groups: string[] }
  const [wantList, setWantList] = useState<WantItem[]>([])

  const [reward, setReward] = useState("")

  const addToWantList = () => {
    if (tempWantCode.length === 0 || tempWantGroups.length === 0) {
      toast.error("請輸入想要科目和至少一個班別")
      return
    }
    const code = tempWantCode[0]
    
    // 檢查是否已存在
    if (wantList.some(w => w.code === code)) {
      toast.error("此科目已在列表中")
      return
    }

    setWantList([...wantList, { code, groups: tempWantGroups }])
    
    // Reset Temps
    setTempWantCode([])
    setTempWantGroups([])
  }

  const removeWantItem = (code: string) => {
    setWantList(wantList.filter(w => w.code !== code))
  }

  const handleSubmit = async () => {
    if (haveCode.length === 0 || haveGroup.length === 0 || wantList.length === 0) {
      toast.error("請完整填寫：持有科目、班別，以及至少一項想要交換的科目")
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    // 構建 DB 格式
    const haveDetails = [{
      id: Math.random().toString(36),
      code: haveCode[0],
      group: haveGroup[0],
      display: `Group ${haveGroup[0]}` // 簡單顯示
    }]

    const { error } = await supabase.from('swap_requests').insert({
      user_id: user?.id,
      have_details: haveDetails,
      wants: wantList,
      reward: reward || null,
      status: 'OPEN'
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("發布成功！")
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <Card className="relative">
        <Link href="/" className="absolute right-4 top-4 p-2 text-gray-500 hover:text-black hover:bg-slate-100 rounded-full transition-colors z-50">
          <X size={24} />
        </Link>

        <CardHeader>
          <CardTitle>建立交換請求</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* === 1. Have Section === */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="bg-slate-100 px-2 py-1 rounded text-sm">1</span>
              我持有的課堂 (Have)
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">科目 (Course)</Label>
                <TagInput 
                  placeholder="e.g. LCH1019" 
                  tags={haveCode} setTags={setHaveCode} maxTags={1} 
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">班別 (Group)</Label>
                <TagInput 
                  placeholder="e.g. B01A" 
                  tags={haveGroup} setTags={setHaveGroup} maxTags={1} 
                />
              </div>
            </div>
          </div>

          {/* === 2. Want Section === */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-600">
              <span className="bg-blue-100 px-2 py-1 rounded text-sm">2</span>
              我想要的課堂 (Want)
            </h3>

            {/* 已加入的列表 */}
            {wantList.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {wantList.map((item) => (
                  <div key={item.code} className="flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-100">
                    <div>
                      <span className="font-bold mr-2 text-blue-800">{item.code}</span>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.groups.map(g => (
                          <span key={g} className="bg-white text-blue-600 border border-blue-200 text-xs px-2 py-0.5 rounded-md">{g}</span>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeWantItem(item.code)}><Trash2 size={16} className="text-red-500"/></Button>
                  </div>
                ))}
              </div>
            )}

            {/* 輸入區 */}
            <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300 space-y-4">
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">想要科目 (Subject)</Label>
                <TagInput 
                  placeholder="e.g. SEHH2042" 
                  tags={tempWantCode} setTags={setTempWantCode} maxTags={1} 
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">想要班別 (Groups)</Label>
                <TagInput 
                  placeholder="e.g. 201, Any, A06B" 
                  tags={tempWantGroups} setTags={setTempWantGroups} 
                />
              </div>
              <Button onClick={addToWantList} className="w-full" variant="secondary" disabled={tempWantCode.length===0 || tempWantGroups.length===0}>
                <Plus className="mr-2 h-4 w-4"/> 加入 Want 列表
              </Button>
            </div>
          </div>

          {/* === 3. Reward === */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-amber-600">
              <span className="bg-amber-100 px-2 py-1 rounded text-sm">3</span>
              報酬 (Optional)
            </h3>
            <div className="relative">
              <Gem className="absolute left-3 top-2.5 h-5 w-5 text-amber-500" />
              <Input placeholder="e.g. Free Lunch, $50..." className="pl-10" value={reward} onChange={(e) => setReward(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full h-12 text-lg" disabled={loading}>
            {loading ? "提交中..." : "發布交換請求"}
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}