'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { LogOut } from "lucide-react"

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  // States
  const [method, setMethod] = useState("WhatsApp")
  const [waNumber, setWaNumber] = useState("")
  const [emailAddr, setEmailAddr] = useState("")

  // 1. 自動抓取當前登入的學校 Email 作為預設值，但用戶可以修改
  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setEmailAddr(user.email)
      }
    }
    fetchUserEmail()
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    let finalDetail = ""

    if (method === "WhatsApp") {
      if (!waNumber || waNumber.length < 8) {
        toast.error("請輸入有效的 WhatsApp 號碼 (至少 8 位)")
        setLoading(false)
        return
      }
      // 移除空格和非數字字符
      finalDetail = waNumber.replace(/\D/g, '')
    } else {
      if (!emailAddr.includes("@")) {
        toast.error("請輸入有效的 Email")
        setLoading(false)
        return
      }
      finalDetail = emailAddr // 這是用戶修改後的 Email，作為聯絡用
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        contact_method: method,
        contact_detail: finalDetail,
        is_onboarded: true
      })
      .eq('id', user.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("設定完成！")
      router.refresh()
      router.replace("/") // 強制跳轉回首頁
    }
    setLoading(false)
  }

  // 登出功能 (防止用戶登錯帳號卡在 Onboarding)
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative">
      
      {/* 右上角登出按鈕 */}
      <Button 
        variant="ghost" 
        className="absolute top-4 right-4 text-gray-500 hover:text-red-500 gap-2"
        onClick={handleSignOut}
      >
        <LogOut size={16} /> 登出 / 切換帳號
      </Button>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>設定聯絡方式</CardTitle>
          <CardDescription>
            為了方便同學與您交換，請設定一個聯絡方式。<br/>
            (此資訊將公開給匹配成功的同學)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="WhatsApp" onValueChange={setMethod} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="WhatsApp">WhatsApp</TabsTrigger>
              <TabsTrigger value="Email">Email</TabsTrigger>
            </TabsList>
            
            <div className="mt-6 space-y-4">
              <TabsContent value="WhatsApp" className="space-y-4">
                <Label>WhatsApp 號碼</Label>
                <div className="flex gap-2 items-center">
                  <span className="bg-gray-100 border px-3 py-2 rounded text-gray-500 text-sm">
                    +852
                  </span>
                  <Input 
                    placeholder="91234567" 
                    type="tel"
                    value={waNumber}
                    onChange={(e) => setWaNumber(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  * 系統會自動生成 wa.me 連結，無需手動輸入網址。
                </p>
              </TabsContent>

              <TabsContent value="Email" className="space-y-4">
                <Label>聯絡 Email 地址</Label>
                <Input 
                  placeholder="name@example.com" 
                  type="email"
                  value={emailAddr}
                  onChange={(e) => setEmailAddr(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  * 預設顯示學校 Email，您可以將其修改為常用的私人 Email。
                </p>
              </TabsContent>
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full mt-6">
              {loading ? "儲存中..." : "完成設定"}
            </Button>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}