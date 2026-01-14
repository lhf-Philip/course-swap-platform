'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client" // 使用 Client 端 Supabase
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner" // 使用新的 toast
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// 定義資料類型
type Course = { code: string; title: string }
type Section = { id: string; group: string; day: string; time: string; lecturer: { name: string } | null }

export default function CreateRequestPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // 1. 狀態管理
  const [courses, setCourses] = useState<Course[]>([])
  
  // "Have" (持有) 的狀態
  const [haveCourseCode, setHaveCourseCode] = useState("")
  const [haveSections, setHaveSections] = useState<Section[]>([])
  const [selectedHaveSectionId, setSelectedHaveSectionId] = useState("")

  // "Want" (想要) 的狀態
  const [wantCourseCode, setWantCourseCode] = useState("")
  const [wantGroup, setWantGroup] = useState("") // 用戶手動輸入或選擇

  // Popover 開關狀態
  const [openHave, setOpenHave] = useState(false)
  const [openWant, setOpenWant] = useState(false)

  // 2. 初始化：抓取所有課程列表
  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from('courses').select('code, title')
      if (data) setCourses(data)
    }
    fetchCourses()
  }, [])

  // 3. 當 "Have Course" 改變時，抓取對應的 Sections
  useEffect(() => {
    if (!haveCourseCode) return
    const fetchSections = async () => {
      const { data } = await supabase
        .from('course_sections')
        .select(`id, group, day, time, lecturer:lecturers(name)`) // 關聯查詢
        .eq('course_code', haveCourseCode)
      
      if (data) setHaveSections(data as any)
    }
    fetchSections()
    setSelectedHaveSectionId("") // 重置已選 Group
  }, [haveCourseCode])

  // 4. 提交表單
  const handleSubmit = async () => {
    if (!selectedHaveSectionId || !wantCourseCode || !wantGroup) {
      toast.error("請填寫所有欄位")
      return
    }

    setLoading(true)
    
    // 獲取當前用戶
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
      router.push('/') // 回首頁
      router.refresh() // 刷新數據
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>建立交換請求</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* =========== 第一部分：我擁有的課 (Have) =========== */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg">我持有的課堂 (Have)</h3>
            
            <div className="flex flex-col space-y-2">
              <Label>科目編號 (Subject Code)</Label>
              <Popover open={openHave} onOpenChange={setOpenHave}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openHave} className="justify-between">
                    {haveCourseCode ? courses.find((c) => c.code === haveCourseCode)?.code : "搜尋科目..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                  <Command>
                    <CommandInput placeholder="搜尋科目..." />
                    <CommandList>
                      <CommandEmpty>找不到科目</CommandEmpty>
                      <CommandGroup>
                        {courses.map((course) => (
                          <CommandItem
                            key={course.code}
                            value={course.code}
                            onSelect={(currentValue) => {
                              setHaveCourseCode(currentValue === haveCourseCode ? "" : currentValue)
                              setOpenHave(false)
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", haveCourseCode === course.code ? "opacity-100" : "opacity-0")}/>
                            {course.code} - {course.title}
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
                <Label>具體班別 (Group)</Label>
                <Select onValueChange={setSelectedHaveSectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇你的 Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {haveSections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {sec.group} | {sec.day} {sec.time} ({sec.lecturer?.name || 'Unknown'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* =========== 第二部分：我想要的課 (Want) =========== */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-blue-600">我想要的課堂 (Want)</h3>
            
            <div className="flex flex-col space-y-2">
              <Label>想要科目 (Subject Code)</Label>
              <Popover open={openWant} onOpenChange={setOpenWant}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openWant} className="justify-between">
                    {wantCourseCode ? courses.find((c) => c.code === wantCourseCode)?.code : "搜尋科目..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                  <Command>
                    <CommandInput placeholder="搜尋科目..." />
                    <CommandList>
                      <CommandEmpty>找不到科目</CommandEmpty>
                      <CommandGroup>
                        {courses.map((course) => (
                          <CommandItem
                            key={course.code}
                            value={course.code}
                            onSelect={(currentValue) => {
                              setWantCourseCode(currentValue === wantCourseCode ? "" : currentValue)
                              setOpenWant(false)
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", wantCourseCode === course.code ? "opacity-100" : "opacity-0")}/>
                            {course.code} - {course.title}
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
              {/* 這裡我們簡單處理，讓用戶輸入，或者可以做成下拉選單 */}
              <Select onValueChange={setWantGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇想要的 Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">不限 (ANY)</SelectItem>
                    <SelectItem value="B01">B01</SelectItem>
                    <SelectItem value="B02">B02</SelectItem>
                    <SelectItem value="201">201</SelectItem>
                    {/* 這裡實際應該根據 Want Course 動態加載，為了簡化暫時手動列出或允許輸入 */}
                  </SelectContent>
                </Select>
              <p className="text-xs text-gray-400">選擇 "不限" 會增加匹配機率</p>
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