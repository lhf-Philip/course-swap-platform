'use client'

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { X, Gem, Plus, Trash2, BookOpen, HelpCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import Link from "next/link"

// === Helper Component: Tag Input ===
function TagInput({ placeholder, tags, setTags, maxTags }: any) {
  const [input, setInput] = useState("")
  const addTag = () => {
    const val = input.trim().toUpperCase()
    if (!val) return
    if (tags.includes(val)) { setInput(""); return }
    if (maxTags && tags.length >= maxTags) {
        if(maxTags === 1) { setTags([val]); setInput(""); return; } 
        return
    }
    setTags([...tags, val])
    setInput("")
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag: string) => (
          <span key={tag} className="flex items-center gap-1 bg-slate-800 text-white text-sm px-2 py-1 rounded-md">
            {tag}
            <button onClick={() => setTags(tags.filter((t: string) => t !== tag))} className="hover:text-red-400 ml-1"><X size={14}/></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input 
          placeholder={tags.length === maxTags ? "已填 (刪除後重填)" : placeholder} 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} 
          disabled={tags.length === maxTags && maxTags > 1} 
        />
        <Button type="button" variant="secondary" onClick={addTag} disabled={!input}><Plus size={18}/></Button>
      </div>
    </div>
  )
}

// === Main Page ===
export default function CreateRequestPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Have States (Course & Group)
  const [haveCode, setHaveCode] = useState<string[]>([])
  const [haveGroup, setHaveGroup] = useState<string[]>([])
  const [haveList, setHaveList] = useState<any[]>([])

  // Want States (Course & Groups)
  const [tempWantCode, setTempWantCode] = useState<string[]>([])
  const [tempWantGroups, setTempWantGroups] = useState<string[]>([])
  const [wantList, setWantList] = useState<any[]>([])

  const [reward, setReward] = useState("")

  // Add Have Item
  const addHaveItem = () => {
    if (haveCode.length === 0 || haveGroup.length === 0) { toast.error("請輸入科目和班別"); return }
    const newItem = {
      id: Math.random().toString(36),
      code: haveCode[0],
      group: haveGroup[0],
      display: `Group ${haveGroup[0]}`
    }
    setHaveList([...haveList, newItem])
    setHaveCode([])
    setHaveGroup([])
  }

  // Add Want Item
  const addWantItem = () => {
    if (tempWantCode.length === 0 || tempWantGroups.length === 0) { toast.error("請輸入想要科目和班別"); return }
    if (wantList.some(w => w.code === tempWantCode[0])) { toast.error("此科目已在列表中"); return }
    
    setWantList([...wantList, { code: tempWantCode[0], groups: tempWantGroups }])
    setTempWantCode([])
    setTempWantGroups([])
  }

  const handleSubmit = async () => {
    if (haveList.length === 0 || wantList.length === 0) {
      toast.error("請至少填寫一項持有和一項想要")
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('swap_requests').insert({
      user_id: user.id,
      have_details: haveList,
      wants: wantList,
      reward: reward || null,
      status: 'OPEN'
    })

    if (error) toast.error(error.message)
    else {
      toast.success("發布成功！")
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <Card className="relative overflow-visible">
        <Link href="/" className="absolute right-4 top-4 p-2 text-gray-500 hover:text-black hover:bg-slate-100 rounded-full transition-colors z-50">
          <X size={24} />
        </Link>

        <CardHeader className="flex flex-row items-center justify-center relative">
          <CardTitle className="text-2xl">建立交換請求</CardTitle>
          
          {/* Help Modal (已修復 Warning) */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute left-4 top-4 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                <HelpCircle size={24} />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" aria-describedby="help-desc">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="text-blue-600"/> 使用教學
                </DialogTitle>
                <DialogDescription id="help-desc">
                  只需三個步驟，輕鬆發布你的交換需求。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-gray-700">
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <strong className="text-slate-900 block mb-1">1. 我持有的課堂 (Have)</strong>
                  輸入你手上的科目代碼 (e.g. SEHH1071) 和班別 (e.g. B01A)。
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <strong className="text-blue-900 block mb-1">2. 我想要的課堂 (Want)</strong>
                  輸入你想換的科目，並輸入你接受的班別。你可以輸入 "ANY" 表示不限班別。
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <strong className="text-amber-900 block mb-1">3. 報酬 (Optional)</strong>
                  提供免費午餐或小費可以增加交換成功的機率。
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="space-y-8">
          
          {/* === 1. Have Section === */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2"><span className="bg-slate-100 px-2 py-1 rounded text-sm">1</span>我持有的課堂</h3>
            {haveList.length > 0 && <div className="flex flex-col gap-2 mb-2">{haveList.map(h => (
              <div key={h.id} className="flex justify-between items-center bg-slate-50 p-2 rounded border">
                <div><span className="font-bold mr-2">{h.code}</span><span className="text-sm bg-white px-1 border rounded">{h.group}</span></div>
                <Button size="sm" variant="ghost" onClick={() => setHaveList(haveList.filter(x=>x.id!==h.id))}><Trash2 size={16} className="text-red-500"/></Button>
              </div>
            ))}</div>}
            
            <div className="p-4 bg-slate-50 border border-dashed rounded-lg space-y-3">
              <div>
                <Label className="text-xs mb-1 block">科目代碼 (Course Code)</Label>
                <TagInput placeholder="e.g. SEHH2042" tags={haveCode} setTags={setHaveCode} maxTags={1} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">班別 (Group/Class)</Label>
                <TagInput placeholder="e.g. B01A, 201" tags={haveGroup} setTags={setHaveGroup} maxTags={1}/>
              </div>
              <Button onClick={addHaveItem} className="w-full" variant="secondary" disabled={haveCode.length===0 || haveGroup.length===0}><Plus className="mr-2"/> 加入</Button>
            </div>
          </div>

          {/* === 2. Want Section === */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-600"><span className="bg-blue-100 px-2 py-1 rounded text-sm">2</span>我想要的課堂</h3>
            {wantList.length > 0 && <div className="flex flex-col gap-2 mb-2">{wantList.map(w => (
              <div key={w.code} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                <div><span className="font-bold mr-2 text-blue-800">{w.code}</span><span className="text-xs text-blue-600">{w.groups.join(", ")}</span></div>
                <Button size="sm" variant="ghost" onClick={() => setWantList(wantList.filter(x=>x.code!==w.code))}><Trash2 size={16} className="text-red-500"/></Button>
              </div>
            ))}</div>}

            <div className="p-4 bg-slate-50 border border-dashed rounded-lg space-y-3">
              <div>
                <Label className="text-xs mb-1 block">想要科目 (Subject)</Label>
                <TagInput placeholder="e.g. LCH1019" tags={tempWantCode} setTags={setTempWantCode} maxTags={1} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">想要班別 (可多選)</Label>
                <TagInput placeholder="e.g. Any, 201, B01" tags={tempWantGroups} setTags={setTempWantGroups}/>
              </div>
              <Button onClick={addWantItem} className="w-full" variant="secondary" disabled={tempWantCode.length===0 || tempWantGroups.length===0}><Plus className="mr-2"/> 加入</Button>
            </div>
          </div>

          {/* === 3. Reward === */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-amber-600"><span className="bg-amber-100 px-2 py-1 rounded text-sm">3</span>報酬 (Optional)</h3>
            <div className="relative"><Gem className="absolute left-3 top-2.5 h-5 w-5 text-amber-500"/><Input placeholder="e.g. Free Lunch..." className="pl-10" value={reward} onChange={e => setReward(e.target.value)}/></div>
          </div>

          <Button onClick={handleSubmit} className="w-full h-12 text-lg" disabled={loading}>{loading ? "提交中..." : "發布"}</Button>
        </CardContent>
      </Card>
    </div>
  )
}