import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Navbar from "@/components/navbar"

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 🔒 安全檢查：請填入你的管理員 Email
  const adminEmail = "25132098S@common.cpce-polyu.edu.hk"

  if (!user || user.email !== adminEmail) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500 font-bold">
        Access Denied 403
      </div>
    )
  }

  // 獲取反饋
  const { data: feedbacks } = await supabase
    .from('feedbacks')
    .select(`*, profiles:user_id(email)`)
    .order('created_at', { ascending: false })

  // 獲取舉報
  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto py-10 px-4 space-y-8">
        <h1 className="text-3xl font-bold">Developer Dashboard</h1>
        
        {/* User Feedbacks */}
        <section>
          <h2 className="text-xl font-semibold mb-4">📢 User Feedbacks ({feedbacks?.length})</h2>
          <div className="grid gap-4">
            {feedbacks?.map((f: any) => (
              <Card key={f.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-sm">{f.profiles?.email || 'Anonymous'}</span>
                    <span className="text-xs text-gray-400">{new Date(f.created_at).toLocaleString()}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{f.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Reports */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-red-600">🚩 Reports ({reports?.length})</h2>
          <div className="grid gap-4">
            {reports?.map((r: any) => (
              <Card key={r.id} className="border-red-200 bg-red-50">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-sm">Report ID: {r.id.slice(0,8)}</span>
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-red-800">Reason: {r.reason}</p>
                  <p className="text-xs text-gray-500 mt-2">Target Request ID: {r.target_request_id}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}