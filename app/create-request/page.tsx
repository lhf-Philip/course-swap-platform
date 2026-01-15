'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Check, ChevronsUpDown, X } from "lucide-react" // 確保這裡有導入 X
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Link from "next/link"

// 修正 TypeScript 定義：加入 type 欄位
type Course = { code: string; title: string }
type Section = { 
  id: string; 
  group: string; 
  type: string; // <--- 之前漏了這行，導致報錯
  day: string; 
  time: string; 
  lecturer: { name: string } | null 
}

export default function CreateRequestPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Data States
  const [courses, setCourses] = useState<Course[]>([])
  
  // Have States
  const [haveCourseCode, setHaveCourseCode] = useState("")
  const [haveSections, setHaveSections] = useState<Section[]>([])
  const [selectedHaveSectionId, setSelectedHaveSectionId] = useState("")

  // Want States
  const [wantCourseCode, setWantCourseCode] = useState("")
  const [availableWantGroups, setAvailableWantGroups] = useState<string[]>([])
  const [wantGroup, setWantGroup] = useState("")

  // UI States
  const [openHave, setOpenHave] = useState(false)
  const [openWant, setOpenWant] = useState(false)

  // 1. Load Courses
  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from('courses').select('code, title').order('code')
      if (data) setCourses(data)
    }
    fetchCourses()
  }, [])

  // 2. Fetch "Have" Sections
  useEffect(() => {
    if (!haveCourseCode) return
    const fetchSections = async () => {
      // 這裡選取 course_sections 表格的所有欄位，包括 type
      const { data } = await supabase
        .from('course_sections')
        .select(`id, group, type, day, time, lecturer:lecturers(name)`)
        .eq('course_code', haveCourseCode)
      
      if (data) setHaveSections(data as any)
    }
    fetchSections()
    setSelectedHaveSectionId("")
  }, [haveCourseCode])

  // 3. Fetch "Want" Groups
  useEffect(() => {
    if (!wantCourseCode) {
      setAvailableWantGroups([])
      return
    }
    const fetchGroups = async () => {
      const { data } = await supabase
        .from('course_sections')
        .select('group')
        .eq('course_code', wantCourseCode)
      
      if (data) {
        // 去除重複並排序
        const uniqueGroups = Array.from(new Set(data.map(item => item.group))).sort()
        setAvailableWantGroups(uniqueGroups)
      }
    }
    fetchGroups()
    setWantGroup("")
  }, [wantCourseCode])

  const handleSubmit = async () => {
    if (!selectedHaveSectionId || !wantCourseCode || !wantGroup) {
      toast.error("請填寫所有欄位")
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('swap_requests').insert({
      user_id: user.id,
      have_section_id: selectedHaveSectionId,
      want_course_code: wantCourseCode,
      want_group: wantGroup,
      status: 'OPEN'
    })

    if (error) {
      toast.error("提交失敗：" + error.message)
    } else {
      toast.success("交換請求已建立！")
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      {/* 
          關鍵修改：
          1. relative: 讓內部的 absolute 定位以這張卡片為基準
          2. overflow-visible: 讓 Combobox 下拉選單能超出卡片顯示
      */}
      <Card className="relative overflow-visible">
        
        {/* X 按鈕：使用 absolute 定位 */}
        <Link 
          href="/" 
          className="absolute right-4 top-4 p-2 text-gray-500 hover:text-black hover:bg-slate-100 rounded-full transition-colors z-50"
          aria-label="Close"
        >
          <X size={24} />
        </Link>

        <CardHeader>
          <CardTitle>建立交換請求</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Have Section */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg">我持有的課堂 (Have)</h3>
            <div className="flex flex-col space-y-2">
              <Label>科目編號</Label>
              <Popover open={openHave} onOpenChange={setOpenHave}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="justify-between w-full">
                    {haveCourseCode || "搜尋科目..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                  <Command>
                    <CommandInput placeholder="Search course..." />
                    <CommandList>
                      <CommandEmpty>No course found.</CommandEmpty>
                      <CommandGroup>
                        {courses.map((course) => (
                          <CommandItem
                            key={course.code}
                            value={course.code}
                            onSelect={(val) => {
                              setHaveCourseCode(val.toUpperCase())
                              setOpenHave(false)
                            }}
                          >
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
              <div className="flex flex-col space-y-2">
                <Label>選擇具體班別 (Group / Time)</Label>
                <Select onValueChange={setSelectedHaveSectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇你的時段" />
                  </SelectTrigger>
                  <SelectContent>
                    {haveSections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {/* 這裡現在應該可以正確讀取 sec.type 了 */}
                        <span className="font-bold">[{sec.group}]</span> {sec.type} | {sec.day} {sec.time} ({sec.lecturer?.name || 'TBA'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Want Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-blue-600">我想要的課堂 (Want)</h3>
            <div className="flex flex-col space-y-2">
              <Label>想要科目</Label>
              <Popover open={openWant} onOpenChange={setOpenWant}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="justify-between w-full">
                    {wantCourseCode || "搜尋科目..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                  <Command>
                    <CommandInput placeholder="Search course..." />
                    <CommandList>
                      <CommandEmpty>No course found.</CommandEmpty>
                      <CommandGroup>
                        {courses.map((course) => (
                          <CommandItem
                            key={course.code}
                            value={course.code}
                            onSelect={(val) => {
                              setWantCourseCode(val.toUpperCase())
                              setOpenWant(false)
                            }}
                          >
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

            <div className="flex flex-col space-y-2">
              <Label>想要班別 (Group)</Label>
              <Select onValueChange={setWantGroup} disabled={!wantCourseCode}>
                  <SelectTrigger>
                    <SelectValue placeholder={wantCourseCode ? "選擇想要的 Group" : "請先選擇科目"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">不限 (ANY)</SelectItem>
                    {availableWantGroups.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={loading}>
            {loading ? "提交中..." : "發布交換請求"}
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}