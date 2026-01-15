import { createClient } from "@/utils/supabase/server"
import Navbar from "@/components/navbar"
import AdminDashboard from "@/components/admin-dashboard" // 引入剛建立的 Client Component

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto py-10 px-4">
        {/* 將用戶 Email 傳給 Dashboard 進行權限驗證 */}
        <AdminDashboard userEmail={user?.email} />
      </div>
    </div>
  )
}