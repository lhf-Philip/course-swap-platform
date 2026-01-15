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

type Course = { code: string; title: string }
type Section = { id: string; group: string; type: string; day: string; time: string; lecturer: { name: string } | null }

// 定義我們要存入 DB 的結構
type HaveItem = { id: string; code: string; group: string; display: string }
type WantItem = { code: string; groups: string[] }

export default function CreateRequestPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [courses, setCourses] = useState<Course[]>([])
  
  // --- Have Logic ---
  const [haveCourseCode, setHaveCourseCode] = useState("")
  const [haveSections, setHaveSections] = useState<Section[]>([])
  const [selectedHaveSectionId, setSelectedHaveSectionId] = useState("")
  const [haveList, setHaveList] = useState<HaveItem[]>([]) // 用戶已添加的 Have 列表

  // --- Want Logic ---
  const [wantCourseCode, setWantCourseCode] = useState("")
  const [availableWantGroups, setAvailableWantGroups] = useState<string[]>([])
  const [selectedWantGroups, setSelectedWantGroups] = useState<string[]>([])
  const [wantList, setWantList] = useState<WantItem[]>([]) // 用戶已添加的 Want 列表

  const [reward, setReward] = useState("")
  const [openHave, setOpenHave] = useState(false)
  const [openWant, setOpenWant] = useState(false)

  // Load Courses
  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from('courses').select('code, title').order('code')
      if (data) setCourses(data)
    }
    fetchCourses()
  }, [])

  // Fetch Have Sections
  useEffect(() => {
    if (!haveCourseCode) return
    const fetchSections = async () => {
      const { data } = await supabase
        .from('course_sections')
        .select(`id, group, type, day, time, lecturer:lecturers(name)`)
        .eq('course_code', haveCourseCode)
      if (data) setHaveSections(data as any)
    }
    fetchSections()
    setSelectedHaveSectionId("")
  }, [haveCourseCode])

  // Fetch Want Groups
  useEffect(() => {
    if (!wantCourseCode) { setAvailableWantGroups([]); return }
    const fetchGroups = async () => {
      const { data } = await supabase.from('course_sections').select('group').eq('course_code', wantCourseCode)
      if (data) {
        const uniqueGroups = Array.from(new Set(data.map(item => item.group))).sort()
        setAvailableWantGroups(uniqueGroups)
      }
    }
    fetchGroups()
    setSelectedWantGroups([])
  }, [wantCourseCode])

  // --- Actions ---

  const addHaveItem = () => {
    if (!haveCourseCode || !selectedHaveSectionId) return
    const section = haveSections.find(s => s.id === selectedHaveSectionId)
    if (!section) return

    // 檢查是否重複
    if (haveList.some(i => i.id === section.id)) {
      toast.error("此課堂已在列表中")
      return
    }

    const newItem: HaveItem = {
      id: section.id,
      code: haveCourseCode,
      group: section.group,
      display: `${section.type} | ${section.day} ${section.time}`
    }
    
    setHaveList([...haveList, newItem])
    // Reset selection
    setHaveCourseCode("")
    setSelectedHaveSectionId("")
  }

  const addWantItem = () => {
    if (!wantCourseCode || selectedWantGroups.length === 0) return

    // 檢查該科目是否已存在
    if (wantList.some(i => i.code === wantCourseCode)) {
      toast.error("此科目已在列表中 (請刪除後重新添加)")
      return
    }

    const newItem: WantItem = {
      code: wantCourseCode,
      groups: [...selectedWantGroups]
    }

    setWantList([...wantList, newItem])
    // Reset selection
    setWantCourseCode("")
    setSelectedWantGroups([])
  }

  const removeHave = (id: string) => setHaveList(haveList.filter(i => i.id !== id))
  const removeWant = (code: string) => setWantList(wantList.filter(i => i.code !== code))

  const toggleWantGroup = (group: string) => {
    if (group === 'ANY') {
      setSelectedWantGroups(selectedWantGroups.includes('ANY') ? [] : ['ANY'])
      return
    }
    let newSelection = selectedWantGroups.filter(g => g !== 'ANY')
    if (newSelection.includes(group)) newSelection = newSelection.filter(g => g !== group)
    else newSelection.push(group)
    setSelectedWantGroups(newSelection)
  }

  const handleSubmit = async () => {
    if (haveList.length === 0 || wantList.length === 0) {
      toast.error("請至少加入一個持有課堂和一個想要課堂")
      return
    }
    
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('swap_requests').insert({
      user_id: user.id,
      have_details: haveList, // 存入 JSONB
      wants: wantList,        // 存入 JSONB
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
          
          {/* === Have Section === */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm">1</span>
              我持有的課堂 (可多選)
            </h3>
            
            {/* 已添加列表 */}
            {haveList.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {haveList.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded border">
                    <div>
                      <span className="font-bold mr-2">{item.code}</span>
                      <span className="bg-slate-200 text-xs px-2 py-1 rounded">Group {item.group}</span>
                      <div className="text-xs text-gray-500 mt-1">{item.display}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeHave(item.id)}><Trash2 size={16} className="text-red-500"/></Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Popover open={openHave} onOpenChange={setOpenHave}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="justify-between w-full">
                      {haveCourseCode || "選擇科目..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[200px]">
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
              
              {haveCourseCode && (
                <div className="flex-1 space-y-2">
                  <Select onValueChange={setSelectedHaveSectionId} value={selectedHaveSectionId}>
                    <SelectTrigger><SelectValue placeholder="選擇Group" /></SelectTrigger>
                    <SelectContent>
                      {haveSections.map((sec) => (
                        <SelectItem key={sec.id} value={sec.id}>
                          [{sec.group}] {sec.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button onClick={addHaveItem} disabled={!selectedHaveSectionId} size="icon"><Plus /></Button>
            </div>
          </div>

          {/* === Want Section === */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-600">
              <span className="bg-blue-100 px-2 py-1 rounded text-sm">2</span>
              我想要的課堂 (可多選)
            </h3>

            {/* 已添加列表 */}
            {wantList.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {wantList.map((item) => (
                  <div key={item.code} className="flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-100">
                    <div>
                      <span className="font-bold mr-2 text-blue-800">{item.code}</span>
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

            <div className="space-y-3">
              <div className="flex gap-2">
                <Popover open={openWant} onOpenChange={setOpenWant}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="justify-between w-full">
                      {wantCourseCode || "添加想要科目..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[200px]">
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
                <Button onClick={addWantItem} disabled={!wantCourseCode || selectedWantGroups.length === 0} size="icon"><Plus /></Button>
              </div>

              {availableWantGroups.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded border">
                  <Button type="button" variant={selectedWantGroups.includes('ANY') ? "default" : "outline"} size="sm" onClick={() => toggleWantGroup('ANY')} className="h-7 text-xs rounded-full">ANY</Button>
                  {availableWantGroups.map(g => (
                    <Button key={g} type="button" variant={selectedWantGroups.includes(g) ? "default" : "outline"} size="sm" onClick={() => toggleWantGroup(g)} className="h-7 text-xs rounded-full">
                      {g}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* === Reward Section === */}
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