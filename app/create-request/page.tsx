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
import { Check, ChevronsUpDown, X, Gem } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Link from "next/link"

type Course = { code: string; title: string }
type Section = { 
  id: string; 
  group: string; 
  type: string;
  day: string; 
  time: string; 
  lecturer: { name: string } | null 
}

export default function CreateRequestPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Data
  const [courses, setCourses] = useState<Course[]>([])
  
  // Have
  const [haveCourseCode, setHaveCourseCode] = useState("")
  const [haveSections, setHaveSections] = useState<Section[]>([])
  const [selectedHaveSectionId, setSelectedHaveSectionId] = useState("")

  // Want (Multi-Select)
  const [wantCourseCode, setWantCourseCode] = useState("")
  const [availableWantGroups, setAvailableWantGroups] = useState<string[]>([])
  const [selectedWantGroups, setSelectedWantGroups] = useState<string[]>([])
  
  // Reward
  const [reward, setReward] = useState("")

  // UI
  const [openHave, setOpenHave] = useState(false)
  const [openWant, setOpenWant] = useState(false)

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from('courses').select('code, title').order('code')
      if (data) setCourses(data)
    }
    fetchCourses()
  }, [])

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
        const uniqueGroups = Array.from(new Set(data.map(item => item.group))).sort()
        setAvailableWantGroups(uniqueGroups)
      }
    }
    fetchGroups()
    setSelectedWantGroups([]) // 重置選擇
  }, [wantCourseCode])

  // 切換選擇的 Group
  const toggleWantGroup = (group: string) => {
    if (group === 'ANY') {
      // 如果選 ANY，清空其他只留 ANY，或取消 ANY
      if (selectedWantGroups.includes('ANY')) {
        setSelectedWantGroups([])
      } else {
        setSelectedWantGroups(['ANY'])
      }
      return
    }

    // 如果選了其他，先移除 ANY
    let newSelection = selectedWantGroups.filter(g => g !== 'ANY')
    
    if (newSelection.includes(group)) {
      newSelection = newSelection.filter(g => g !== group)
    } else {
      newSelection.push(group)
    }
    setSelectedWantGroups(newSelection)
  }

  const handleSubmit = async () => {
    if (!selectedHaveSectionId || !wantCourseCode || selectedWantGroups.length === 0) {
      toast.error("請完整填寫 (持有課堂、想要科目、想要班別)")
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('swap_requests').insert({
      user_id: user.id,
      have_section_id: selectedHaveSectionId,
      want_course_code: wantCourseCode,
      want_groups: selectedWantGroups, // 插入陣列
      reward: reward || null,          // 插入報酬
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
      <Card className="relative overflow-visible">
        <Link href="/" className="absolute right-4 top-4 p-2 text-gray-500 hover:text-black hover:bg-slate-100 rounded-full transition-colors z-50">
          <X size={24} />
        </Link>

        <CardHeader>
          <CardTitle>建立交換請求</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* Have Section */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm">1</span>
              我持有的課堂 (Have)
            </h3>
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
                    <CommandInput placeholder="Search..." />
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
              <div className="flex flex-col space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>選擇具體班別</Label>
                <Select onValueChange={setSelectedHaveSectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇你的時段" />
                  </SelectTrigger>
                  <SelectContent>
                    {haveSections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        <span className="font-bold">[{sec.group}]</span> {sec.type} | {sec.day} {sec.time} ({sec.lecturer?.name || 'TBA'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Want Section */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-600">
              <span className="bg-blue-100 px-2 py-1 rounded text-sm">2</span>
              我想要的課堂 (Want)
            </h3>
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
                    <CommandInput placeholder="Search..." />
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

            {availableWantGroups.length > 0 && (
              <div className="flex flex-col space-y-3 animate-in fade-in slide-in-from-top-2">
                <Label>想要班別 (可多選)</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={selectedWantGroups.includes('ANY') ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleWantGroup('ANY')}
                    className="rounded-full"
                  >
                    不限 (ANY)
                  </Button>
                  {availableWantGroups.map(group => (
                    <Button
                      key={group}
                      type="button"
                      variant={selectedWantGroups.includes(group) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleWantGroup(group)}
                      className={cn(
                        "rounded-full transition-all",
                        selectedWantGroups.includes(group) ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
                      )}
                    >
                      {group}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-gray-400">已選擇: {selectedWantGroups.length > 0 ? selectedWantGroups.join(", ") : "未選擇"}</p>
              </div>
            )}
          </div>

          {/* Reward Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-amber-600">
              <span className="bg-amber-100 px-2 py-1 rounded text-sm">3</span>
              報酬 (Optional)
            </h3>
            <div className="flex flex-col space-y-2">
              <Label>提供報酬</Label>
              <div className="relative">
                <Gem className="absolute left-3 top-2.5 h-5 w-5 text-amber-500" />
                <Input 
                  placeholder="e.g. Free Lunch, $50, Coffee..." 
                  className="pl-10"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400">適當的報酬可以增加交換成功的機率。</p>
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full text-lg h-12" disabled={loading}>
            {loading ? "提交中..." : "發布交換請求"}
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}