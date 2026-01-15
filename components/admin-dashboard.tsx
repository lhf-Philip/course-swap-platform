'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Trash2, Edit, Save, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function AdminDashboard({ userEmail }: { userEmail: string | undefined }) {
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const [requests, setRequests] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editHaveCode, setEditHaveCode] = useState("")
  const [editHaveGroup, setEditHaveGroup] = useState("")

  const ADMIN_EMAIL = "25132098S@common.cpce-polyu.edu.hk" // 你的 Email

  useEffect(() => {
    if (userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setIsAdmin(true)
      fetchData()
    } else {
      setLoading(false)
    }
  }, [userEmail])

  const fetchData = async () => {
    const { data: reqs } = await supabase
      .from('swap_requests')
      .select('*, profiles:user_id(email)')
      .order('created_at', { ascending: false })
    
    const { data: feeds } = await supabase
      .from('feedbacks')
      .select('*, profiles:user_id(email)')
      .order('created_at', { ascending: false })

    setRequests(reqs || [])
    setFeedbacks(feeds || [])
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if(!confirm("Confirm delete?")) return
    await supabase.from('swap_requests').delete().eq('id', id)
    toast.success("Deleted")
    fetchData()
  }

  const startEdit = (req: any) => {
    setEditingId(req.id)
    // 假設 Have 只有一個
    if (req.have_details && req.have_details.length > 0) {
      setEditHaveCode(req.have_details[0].code)
      setEditHaveGroup(req.have_details[0].group)
    }
  }

  const saveEdit = async (id: string) => {
    // 重新構造 JSON (保持舊有結構)
    const newHaveDetails = [{
      id: Math.random().toString(36),
      code: editHaveCode,
      group: editHaveGroup,
      display: `Group ${editHaveGroup}`
    }]

    const { error } = await supabase
      .from('swap_requests')
      .update({ have_details: newHaveDetails })
      .eq('id', id)

    if (error) toast.error("Update failed")
    else {
      toast.success("Updated")
      setEditingId(null)
      fetchData()
    }
  }

  if (loading) return <div className="p-10">Checking permissions...</div>
  if (!isAdmin) return <div className="p-10 text-red-500 font-bold">Access Denied: You are not the admin.</div>

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Console</h1>

      {/* Post Management */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Manage Posts ({requests.length})</h2>
        <div className="grid gap-4">
          {requests.map((req) => (
            <Card key={req.id} className="overflow-hidden">
              <CardHeader className="bg-slate-100 py-2 flex flex-row justify-between items-center">
                <span className="text-sm font-mono text-gray-500">{req.profiles?.email}</span>
                <div className="flex gap-2">
                  {editingId === req.id ? (
                    <>
                      <Button size="sm" onClick={() => saveEdit(req.id)} className="h-8"><Save size={14}/></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8"><X size={14}/></Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => startEdit(req)} className="h-8"><Edit size={14}/></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(req.id)} className="h-8"><Trash2 size={14}/></Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {editingId === req.id ? (
                  <div className="flex gap-2 items-center">
                    <Input value={editHaveCode} onChange={e => setEditHaveCode(e.target.value)} placeholder="Course" className="w-24"/>
                    <Input value={editHaveGroup} onChange={e => setEditHaveGroup(e.target.value)} placeholder="Group" className="w-24"/>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <Badge variant="secondary">{req.have_details?.[0]?.code}</Badge>
                    <span>{req.have_details?.[0]?.group}</span>
                  </div>
                )}
                <div className="mt-2 text-sm text-gray-500">
                  Want: {req.wants?.map((w: any) => w.code).join(", ")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Feedback Management */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Feedbacks ({feedbacks.length})</h2>
        <div className="grid gap-4">
          {feedbacks.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <p className="font-bold text-sm mb-1">{f.profiles?.email || 'Anonymous'}</p>
                <p className="text-gray-700 whitespace-pre-wrap">{f.message}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(f.created_at).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}