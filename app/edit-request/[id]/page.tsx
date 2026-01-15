'use client'

import { useState, useEffect, use } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Check, ChevronsUpDown, X, Gem, Plus, Trash2, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Link from "next/link"

// 複用之前的 Helper Component
function TagInput({ placeholder, tags, setTags, maxTags }: any) {
  const [input, setInput] = useState("")
  const addTag = () => {
    const val = input.trim().toUpperCase()
    if (!val) return
    if (tags.includes(val)) { setInput(""); return }
    if (maxTags && tags.length >= maxTags) {
        if(maxTags === 1) { setTags([val]); setInput(""); return; } // Replace if max 1
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
        <Input placeholder={tags.length === maxTags ? "已填" : placeholder} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} disabled={tags.length === maxTags && maxTags > 1} />
        <Button type="button" variant="secondary" onClick={addTag} disabled={!input}><Plus size={18}/></Button>
      </div>
    </div>
  )
}

export default function EditRequestPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15: params 需 unwrapped
  const { id } = use(params)
  
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [courses, setCourses] = useState<any[]>([])
  
  // Have (Multi-Select)
  const [haveCode, setHaveCode] = useState<string[]>([])
  const [haveGroup, setHaveGroup] = useState<string[]>([])
  const [haveList, setHaveList] = useState<any[]>([])

  // Want (Multi-Select)
  const [tempWantCode, setTempWantCode] = useState<string[]>([])
  const [tempWantGroups, setTempWantGroups] = useState<string[]>([])
  const [wantList, setWantList] = useState<any[]>([])

  const [reward, setReward] = useState("")
  const [openHave, setOpenHave] = useState(false)
  const [openWant, setOpenWant] = useState(false)

  // Load Data
  useEffect(() => {
    const init = async () => {
      // 1. Courses
      const { data: coursesData } = await supabase.from('courses').select('code, title').order('code')
      if (coursesData) setCourses(coursesData)

      // 2. Request Data
      const { data: request, error } = await supabase.from('swap_requests').select('*').eq('id', id).single()
      
      if (error || !request) {
        toast.error("找不到該請求")
        router.push('/')
        return
      }

      // Check Owner
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id !== request.user_id) {
        toast.error("您無權編輯此請求")
        router.push('/')
        return
      }

      // Fill State
      setHaveList(request.have_details || [])
      setWantList(request.wants || [])
      setReward(request.reward || "")
      setLoading(false)
    }
    init()
  }, [id])

  // --- Logic ---
  const addHaveList = () => {
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

  const removeHave = (id: string) => setHaveList(haveList.filter(i => i.id !== id))

  const addWantList = () => {
    if (tempWantCode.length === 0 || tempWantGroups.length === 0) { toast.error("請輸入想要科目和至少一個班別"); return }
    setWantList([...wantList, { code: tempWantCode[0], groups: tempWantGroups }])
    setTempWantCode([])
    setTempWantGroups([])
  }

  const removeWant = (code: string) => setWantList(wantList.filter(w => w.code !== code))

  const handleUpdate = async () => {
    if (haveList.length === 0 || wantList.length === 0) { toast.error("請完整填寫"); return }
    setSubmitting(true)
    
    const { error } = await supabase.from('swap_requests').update({
      have_details: haveList,
      wants: wantList,
      reward: reward || null
    }).eq('id', id)

    if (error) toast.error(error.message)
    else {
      toast.success("更新成功！")
      router.push('/')
      router.refresh()
    }
    setSubmitting(false)
  }

  if (loading) return <div className="p-10 text-center">Loading...</div>

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <Card className="relative overflow-visible">
        <Link href="/" className="absolute left-4 top-4 p-2 text-gray-500 hover:text-black hover:bg-slate-100 rounded-full transition-colors z-50">
          <ArrowLeft size={24} />
        </Link>

        <CardHeader><CardTitle className="text-center">編輯請求</CardTitle></CardHeader>
        <CardContent className="space-y-8">
          
          {/* Have Section */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2"><span className="bg-slate-100 px-2 py-1 rounded text-sm">1</span>我持有的課堂 (Have)</h3>
            
            {/* List */}
            <div className="space-y-2 mb-4">
                {haveList.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded border">
                    <div><span className="font-bold mr-2">{item.code}</span><span className="bg-slate-200 text-xs px-2 py-1 rounded">{item.group}</span></div>
                    <Button variant="ghost" size="sm" onClick={() => removeHave(item.id)}><Trash2 size={16} className="text-red-500"/></Button>
                  </div>
                ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs mb-1 block">Course</Label>
                        <Popover open={openHave} onOpenChange={setOpenHave}>
                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between">{haveCode[0] || "Select..."}<ChevronsUpDown className="h-4 w-4 opacity-50"/></Button></PopoverTrigger>
                            <PopoverContent className="p-0 w-[200px]"><Command><CommandInput placeholder="Search..."/><CommandList><CommandGroup>{courses.map(c => <CommandItem key={c.code} value={c.code} onSelect={v => {setHaveCode([v.toUpperCase()]); setOpenHave(false)}}><Check className={cn("mr-2 h-4 w-4", haveCode[0]===c.code?"opacity-100":"opacity-0")}/>{c.code}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label className="text-xs mb-1 block">Group</Label>
                        <TagInput placeholder="e.g. 201" tags={haveGroup} setTags={setHaveGroup} maxTags={1} />
                    </div>
                </div>
                <Button onClick={addHaveList} className="w-full" variant="secondary" disabled={haveCode.length===0 || haveGroup.length===0}><Plus className="mr-2"/> 加入列表</Button>
            </div>
          </div>

          {/* Want Section */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-600"><span className="bg-blue-100 px-2 py-1 rounded text-sm">2</span>我想要的課堂 (Want)</h3>
            
            {/* List */}
            <div className="space-y-2 mb-4">
                {wantList.map((item) => (
                  <div key={item.code} className="flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-100">
                    <div><span className="font-bold mr-2 text-blue-800">{item.code}</span><div className="flex gap-1 mt-1 flex-wrap">{item.groups.map((g:string) => <span key={g} className="bg-white border text-xs px-2 py-0.5 rounded-md">{g}</span>)}</div></div>
                    <Button variant="ghost" size="sm" onClick={() => removeWant(item.code)}><Trash2 size={16} className="text-red-500"/></Button>
                  </div>
                ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300 space-y-4">
                <div>
                    <Label className="text-xs mb-1 block">Want Course</Label>
                    <Popover open={openWant} onOpenChange={setOpenWant}>
                        <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between">{tempWantCode[0] || "Select..."}<ChevronsUpDown className="h-4 w-4 opacity-50"/></Button></PopoverTrigger>
                        <PopoverContent className="p-0 w-[200px]"><Command><CommandInput placeholder="Search..."/><CommandList><CommandGroup>{courses.map(c => <CommandItem key={c.code} value={c.code} onSelect={v => {setTempWantCode([v.toUpperCase()]); setOpenWant(false)}}><Check className={cn("mr-2 h-4 w-4", tempWantCode[0]===c.code?"opacity-100":"opacity-0")}/>{c.code}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
                    </Popover>
                </div>
                <div>
                    <Label className="text-xs mb-1 block">Want Groups</Label>
                    <TagInput placeholder="e.g. Any, 201" tags={tempWantGroups} setTags={setTempWantGroups} />
                </div>
                <Button onClick={addWantList} className="w-full" variant="secondary" disabled={tempWantCode.length===0 || tempWantGroups.length===0}><Plus className="mr-2"/> 加入列表</Button>
            </div>
          </div>

          {/* Reward */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-amber-600"><span className="bg-amber-100 px-2 py-1 rounded text-sm">3</span>報酬 (Optional)</h3>
            <div className="relative">
              <Gem className="absolute left-3 top-2.5 h-5 w-5 text-amber-500" />
              <Input placeholder="e.g. Free Lunch..." className="pl-10" value={reward} onChange={(e) => setReward(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleUpdate} className="w-full h-12 text-lg" disabled={submitting}>
            {submitting ? "更新中..." : "確認更新"}
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}