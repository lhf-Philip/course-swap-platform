'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Check, ChevronsUpDown, X, Gem, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Link from "next/link"

// 定義結構
type Course = { code: string; title: string }
// HaveItem: 存儲用戶持有的詳細資訊
type HaveItem = { 
  id: string; // 用隨機 ID 讓 React 渲染列表
  code: string; 
  lectureGroup: string; // 下拉選單選的 (e.g. 201)
  tutorial: string;     // 手動輸入的 (e.g. Tut A)
}
// WantItem: 存儲用戶想要的詳細資訊
type WantItem = { code: string; groups: string[] }

export default function CreateRequestPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [courses, setCourses] = useState<Course[]>([])
  
  // --- Have Section States ---
  const [haveCourseCode, setHaveCourseCode] = useState("")
  const [availableLectureGroups, setAvailableLectureGroups] = useState<string[]>([])
  const [selectedLectureGroup, setSelectedLectureGroup] = useState("")
  const [manualTutorial, setManualTutorial] = useState("") // 手動輸入 Tutorial
  const [haveList, setHaveList] = useState<HaveItem[]>([]) 

  // --- Want Section States ---
  const [wantCourseCode, setWantCourseCode] = useState("")
  const [manualWantInput, setManualWantInput] = useState("") // 手動輸入想要 Group
  const [selectedWantGroups, setSelectedWantGroups] = useState<string[]>([]) // 暫存目前的輸入
  const [wantList, setWantList] = useState<WantItem[]>([]) 

  const [reward, setReward] = useState("")
  const [openHave, setOpenHave] = useState(false)
  const [openWant, setOpenWant] = useState(false)

  // 1. 初始化：載入課程列表
  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from('courses').select('code, title').order('code')
      if (data) setCourses(data)
    }
    fetchCourses()
  }, [])

  // 2. 當 Have Course 改變時，抓取 Lecture Groups (Dropdown)
  useEffect(() => {
    if (!haveCourseCode) {
      setAvailableLectureGroups([])
      return
    }
    const fetchGroups = async () => {
      // 這裡我們只抓取 unique groups (假設這些是 Lecture Group)
      const { data } = await supabase
        .from('course_sections')
        .select('group')
        .eq('course_code', haveCourseCode)
      
      if (data) {
        // 去重並排序
        const uniqueGroups = Array.from(new Set(data.map(item => item.group))).sort()
        setAvailableLectureGroups(uniqueGroups)
      }
    }
    fetchGroups()
    setSelectedLectureGroup("")
    setManualTutorial("")
  }, [haveCourseCode])

  // --- Actions ---

  // 添加到 Have 列表
  const addHaveItem = () => {
    if (!haveCourseCode || !selectedLectureGroup) {
      toast.error("請選擇科目和 Lecture Group")
      return
    }

    const newItem: HaveItem = {
      id: Math.random().toString(36).substr(2, 9),
      code: haveCourseCode,
      lectureGroup: selectedLectureGroup,
      tutorial: manualTutorial.trim() || "No Tut" // 如果沒填就顯示 No Tut
    }
    
    setHaveList([...haveList, newItem])
    // Reset inputs
    setHaveCourseCode("")
    setSelectedLectureGroup("")
    setManualTutorial("")
  }

  // 添加 Want Group Tag (手動輸入)
  const addManualWantGroup = () => {
    const val = manualWantInput.trim().toUpperCase()
    if (!val) return
    if (selectedWantGroups.includes(val)) {
      toast.error("已存在")
      return
    }
    setSelectedWantGroups([...selectedWantGroups, val])
    setManualWantInput("")
  }

  // 添加到 Want 列表 (整張卡片)
  const addWantItem = () => {
    if (!wantCourseCode || selectedWantGroups.length === 0) {
      toast.error("請選擇科目並至少輸入一個想要的 Group")
      return
    }

    if (wantList.some(i => i.code === wantCourseCode)) {
      toast.error("此科目已在列表中")
      return
    }

    const newItem: WantItem = {
      code: wantCourseCode,
      groups: [...selectedWantGroups]
    }

    setWantList([...wantList, newItem])
    // Reset inputs
    setWantCourseCode("")
    setSelectedWantGroups([])
    setManualWantInput("")
  }

  const removeHave = (id: string) => setHaveList(haveList.filter(i => i.id !== id))
  const removeWant = (code: string) => setWantList(wantList.filter(i => i.code !== code))
  const removeWantGroupTag = (tag: string) => setSelectedWantGroups(selectedWantGroups.filter(g => g !== tag))

  const handleSubmit = async () => {
    if (haveList.length === 0 || wantList.length === 0) {
      toast.error("請至少填寫一個持有和一個想要")
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

    if (error) {
      toast.error("提交失敗：" + error.message)
    } else {
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

        <CardHeader>
          <CardTitle>建立交換請求 (Multi-Swap)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* === 1. Have Section === */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm">1</span>
              我持有的課堂 (Have)
            </h3>
            
            {/* 已添加列表 */}
            {haveList.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {haveList.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded border">
                    <div>
                      <span className="font-bold mr-2">{item.code}</span>
                      <span className="bg-slate-200 text-xs px-2 py-1 rounded">Lect {item.lectureGroup}</span>
                      {item.tutorial && item.tutorial !== "No Tut" && (
                        <span className="ml-2 text-sm text-gray-600">+ {item.tutorial}</span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeHave(item.id)}><Trash2 size={16} className="text-red-500"/></Button>
                  </div>
                ))}
              </div>
            )}

            {/* 輸入區塊 */}
            <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              {/* 科目搜尋 */}
              <div className="flex flex-col space-y-1.5">
                <Label className="text-xs text-gray-500">科目 (Subject)</Label>
                <Popover open={openHave} onOpenChange={setOpenHave}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="justify-between w-full bg-white">
                      {haveCourseCode || "搜尋科目..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                    <Command>
                      <CommandInput placeholder="Search..." />
                      <CommandList>
                        <CommandGroup>
                          {courses.map((course) => (
                            <CommandItem key={course.code} value={course.code} onSelect={(val) => { setHaveCourseCode(val.toUpperCase()); setOpenHave(false) }}>
                              <Check className={cn("mr-2 h-4 w-4", haveCourseCode === course.code ? "opacity-100" : "opacity-0")}/>
                              {course.code}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Lecture Dropdown + Tutorial Input */}
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-gray-500">Lecture Group</Label>
                  <Select onValueChange={setSelectedLectureGroup} value={selectedLectureGroup} disabled={!haveCourseCode}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {availableLectureGroups.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-gray-500">Tutorial (手動輸入)</Label>
                  <Input 
                    placeholder="e.g. Tut A, Lab B3" 
                    value={manualTutorial} 
                    onChange={(e) => setManualTutorial(e.target.value)} 
                    disabled={!haveCourseCode}
                    className="bg-white"
                  />
                </div>
              </div>

              <Button onClick={addHaveItem} disabled={!selectedLectureGroup} className="w-full mt-2" variant="secondary">
                <Plus className="mr-2 h-4 w-4"/> 加入列表
              </Button>
            </div>
          </div>

          {/* === 2. Want Section === */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-600">
              <span className="bg-blue-100 px-2 py-1 rounded text-sm">2</span>
              我想要的課堂 (Want)
            </h3>

            {/* 已添加列表 */}
            {wantList.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {wantList.map((item) => (
                  <div key={item.code} className="flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-100">
                    <div className="flex flex-col">
                      <span className="font-bold text-blue-800">{item.code}</span>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.groups.map(g => (
                          <span key={g} className="bg-white text-blue-600 border border-blue-200 text-xs px-2 py-0.5 rounded-full">{g}</span>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeWant(item.code)}><Trash2 size={16} className="text-red-500"/></Button>
                  </div>
                ))}
              </div>
            )}

            {/* 輸入區塊 */}
            <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <div className="flex flex-col space-y-1.5">
                <Label className="text-xs text-gray-500">科目 (Subject)</Label>
                <Popover open={openWant} onOpenChange={setOpenWant}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="justify-between w-full bg-white">
                      {wantCourseCode || "搜尋科目..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                    <Command>
                      <CommandInput placeholder="Search..." />
                      <CommandList>
                        <CommandGroup>
                          {courses.map((course) => (
                            <CommandItem key={course.code} value={course.code} onSelect={(val) => { setWantCourseCode(val.toUpperCase()); setOpenWant(false) }}>
                              <Check className={cn("mr-2 h-4 w-4", wantCourseCode === course.code ? "opacity-100" : "opacity-0")}/>
                              {course.code}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 手動輸入 Want Groups + 顯示已輸入的 Tags */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">想要班別 (輸入後按 Enter 或點擊 +)</Label>
                
                {/* 顯示目前暫存的 Tags */}
                {selectedWantGroups.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedWantGroups.map(tag => (
                      <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                        {tag}
                        <button onClick={() => removeWantGroupTag(tag)} className="hover:text-red-500"><X size={12}/></button>
                      </span>
                    ))}
                  </div>
                )}

                {/* 修正這裡：使用 flex-wrap 防止按鈕突出 */}
                <div className="flex flex-wrap gap-2 items-center"> 
                  <Input 
                    placeholder="e.g. ANY, 201, Tut A" 
                    value={manualWantInput}
                    onChange={(e) => setManualWantInput(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addManualWantGroup(); } }}
                    disabled={!wantCourseCode}
                    className="flex-1 min-w-[150px] bg-white" 
                  />
                  <Button 
                    type="button" 
                    onClick={addManualWantGroup} 
                    disabled={!manualWantInput} 
                    size="icon" 
                    variant="outline"
                    className="shrink-0"
                  >
                    <Plus size={18} />
                  </Button>
                </div>
                <p className="text-[10px] text-gray-400">* 建議輸入 "ANY" 表示不限班別</p>
              </div>

              <Button onClick={addWantItem} disabled={!wantCourseCode || selectedWantGroups.length === 0} className="w-full mt-2" variant="secondary">
                <Plus className="mr-2 h-4 w-4"/> 加入 Want 列表
              </Button>
            </div>
          </div>

          {/* === 3. Reward Section === */}
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

          <Button onClick={handleSubmit} className="w-full text-lg h-12" disabled={loading}>
            {loading ? "提交中..." : "發布 (每個帳號限一則)"}
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}