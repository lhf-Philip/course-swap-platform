'use client'

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import RequestCard from "@/components/request-card"
import { User, List } from "lucide-react"
import { useRouter } from "next/navigation"

type ProfileViewProps = {
  profile: any
  posts: any[]
}

export default function ProfileView({ profile, posts }: ProfileViewProps) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Profile State
  const [method, setMethod] = useState(profile?.contact_method || "WhatsApp")
  const [detail, setDetail] = useState(profile?.contact_detail || "")

  const handleUpdateProfile = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        contact_method: method,
        contact_detail: detail
      })
      .eq('id', profile.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Profile updated!")
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* 左側：個人資料設定 */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20}/> 個人設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>學校 Email (唯讀)</Label>
              <Input value={profile?.email} disabled className="bg-slate-100"/>
            </div>
            
            <div className="space-y-2">
              <Label>聯絡方式</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>聯絡號碼 / 地址</Label>
              <Input value={detail} onChange={(e) => setDetail(e.target.value)} />
              <p className="text-xs text-gray-500">
                {method === 'WhatsApp' ? '請輸入純號碼 (e.g. 91234567)' : '請輸入 Email'}
              </p>
            </div>

            <Button onClick={handleUpdateProfile} disabled={loading} className="w-full">
              {loading ? "Updating..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 右側：我的 Posts */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <List /> 我的交換請求 ({posts.length})
        </h2>
        
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map(req => (
              <RequestCard key={req.id} request={req} currentUserId={profile.id} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed text-gray-500">
            您目前沒有任何請求。
          </div>
        )}
      </div>
    </div>
  )
}