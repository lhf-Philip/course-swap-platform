import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default async function OnboardingPage() {
  async function completeOnboarding(formData: FormData) {
    'use server'
    // 關鍵修正：這裡加了 await
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return redirect('/login')

    const contactMethod = formData.get('contactMethod') as string
    const contactDetail = formData.get('contactDetail') as string

    const { error } = await supabase
      .from('profiles')
      .update({
        contact_method: contactMethod,
        contact_detail: contactDetail,
        is_onboarded: true
      })
      .eq('id', user.id)

    if (error) {
      console.error(error)
      return
    }

    redirect('/')
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md">
      {/* UI 內容保持不變 */}
      <h1 className="text-2xl font-bold mb-4">歡迎來到 Swap 科平台</h1>
      <p className="mb-6 text-gray-600">在開始之前，請設定您的聯絡方式，以便其他同學找到您。</p>
      
      <form action={completeOnboarding} className="space-y-4">
        <div>
          <Label>聯絡方式</Label>
          <Select name="contactMethod" required>
            <SelectTrigger>
              <SelectValue placeholder="選擇方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
              <SelectItem value="Email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>號碼 / 地址</Label>
          <Input name="contactDetail" placeholder="e.g. 91234567 or student@..." required />
          <p className="text-xs text-gray-400 mt-1">
            * 建議使用 WhatsApp 連結 (https://wa.me/85291234567) 方便點擊
          </p>
        </div>

        <Button type="submit" className="w-full">完成設定</Button>
      </form>
    </div>
  )
}