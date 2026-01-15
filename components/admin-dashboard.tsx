'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Trash2, Edit, Save, X, Gem } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { deleteRequest, closeRequest, revalidateAll } from "@/app/actions"

export default function AdminDashboard({ userEmail }: { userEmail: string | undefined }) {
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const [requests, setRequests] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  
  // --- Edit States ---
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Have
  const [editHaveCode, setEditHaveCode] = useState("")
  const [editHaveGroup, setEditHaveGroup] = useState("")
  
  // Want (目前假設主要修第一組 Want，這對 99% 情況足夠)
  const [editWantCode, setEditWantCode] = useState("")
  const [editWantGroupsStr, setEditWantGroupsStr] = useState("") // 用字串編輯 "A, B, C"
  
  // Reward
  const [editReward, setEditReward] = useState("")

  const ADMIN_EMAIL = "25132098S@common.cpce-polyu.edu.hk"

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
    await revalidateAll()
    toast.success("Deleted")
    fetchData()
  }

  const startEdit = (req: any) => {
    setEditingId(req.id)
    
    // Setup Have
    if (req.have_details && req.have_details.length > 0) {
      setEditHaveCode(req.have_details[0].code)
      setEditHaveGroup(req.have_details[0].group)
    } else {
      setEditHaveCode("")
      setEditHaveGroup("")
    }

    // Setup Want (取出第一個 Want Item 來編輯)
    if (req.wants && req.wants.length > 0) {
      setEditWantCode(req.wants[0].code)
      // 將陣列 ["A", "B01"] 轉為字串 "A, B01" 方便編輯
      setEditWantGroupsStr(req.wants[0].groups.join(", "))
    } else {
      setEditWantCode("")
      setEditWantGroupsStr("")
    }

    // Setup Reward
    setEditReward(req.reward || "")
  }

  const saveEdit = async (id: string) => {
    // 1. Reconstruct Have JSON
    const newHaveDetails = [{
      id: Math.random().toString(36),
      code: editHaveCode.toUpperCase().trim(),
      group: editHaveGroup.toUpperCase().trim(),
      display: editHaveGroup.toUpperCase().trim()
    }]

    // 2. Reconstruct Want JSON
    // 將字串 "A, B01" 轉回陣列 ["A", "B01"]
    const newGroupsArray = editWantGroupsStr.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== "")
    const newWants = [{
      code: editWantCode.toUpperCase().trim(),
      groups: newGroupsArray
    }]

    // 3. Update DB
    const { error } = await supabase
      .from('swap_requests')
      .update({ 
        have_details: newHaveDetails,
        wants: newWants,
        reward: editReward || null
      })
      .eq('id', id)

    if (error) toast.error("Update failed: " + error.message)
    else {
      await revalidateAll()
      toast.success("Updated successfully")
      setEditingId(null)
      fetchData()
    }
  }

  if (loading) return <div className="p-10">Checking permissions...</div>
  if (!isAdmin) return <div className="p-10 text-red-500 font-bold">Access Denied: {userEmail} is not admin.</div>

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Console</h1>

      {/* Post Management */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Manage Posts ({requests.length})</h2>
        <div className="grid gap-4">
          {requests.map((req) => (
            <Card key={req.id} className="overflow-hidden border-2 border-slate-100">
              {/* Header: Email & Actions */}
              <CardHeader className="bg-slate-50 py-3 flex flex-row justify-between items-center border-b">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-slate-700">{req.profiles?.email}</span>
                  <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleString()}</span>
                </div>
                
                <div className="flex gap-2">
                  {editingId === req.id ? (
                    <>
                      <Button size="sm" onClick={() => saveEdit(req.id)} className="bg-green-600 hover:bg-green-700"><Save size={16}/></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X size={16}/></Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => startEdit(req)}><Edit size={16}/></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(req.id)}><Trash2 size={16}/></Button>
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                
                {/* === HAVE SECTION === */}
                <div>
                  <Label className="text-xs text-gray-500 font-bold mb-1 block">HAVE</Label>
                  {editingId === req.id ? (
                    <div className="flex gap-2">
                      <Input value={editHaveCode} onChange={e => setEditHaveCode(e.target.value)} placeholder="Code" className="w-32 font-bold"/>
                      <Input value={editHaveGroup} onChange={e => setEditHaveGroup(e.target.value)} placeholder="Group" className="flex-1"/>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-base">{req.have_details?.[0]?.code}</Badge>
                      <span className="text-gray-800 font-medium">{req.have_details?.[0]?.group}</span>
                    </div>
                  )}
                </div>

                {/* === WANT SECTION === */}
                <div>
                  <Label className="text-xs text-blue-500 font-bold mb-1 block">WANT</Label>
                  {editingId === req.id ? (
                    <div className="flex gap-2">
                      <Input value={editWantCode} onChange={e => setEditWantCode(e.target.value)} placeholder="Want Code" className="w-32 font-bold border-blue-200"/>
                      {/* 用字串編輯陣列，例如 "A, B, C" */}
                      <Input value={editWantGroupsStr} onChange={e => setEditWantGroupsStr(e.target.value)} placeholder="Groups (comma separated)" className="flex-1 border-blue-200"/>
                    </div>
                  ) : (
                    <div className="bg-blue-50 p-2 rounded border border-blue-100">
                      {req.wants?.map((w: any, idx: number) => (
                        <div key={idx}>
                          <span className="font-bold text-blue-800 mr-2">{w.code}</span>
                          <span className="text-blue-600 text-sm">
                            {w.groups?.join(", ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* === REWARD SECTION === */}
                <div>
                  <Label className="text-xs text-amber-600 font-bold mb-1 block">REWARD</Label>
                  {editingId === req.id ? (
                    <div className="flex gap-2 items-center">
                      <Gem size={16} className="text-amber-500"/>
                      <Input value={editReward} onChange={e => setEditReward(e.target.value)} placeholder="No reward" className="flex-1 border-amber-200"/>
                    </div>
                  ) : (
                    req.reward ? (
                      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-2 py-1 rounded w-fit">
                        <Gem size={14} /> {req.reward}
                      </div>
                    ) : <span className="text-gray-300 text-sm">None</span>
                  )}
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Feedback Management */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-700">User Feedbacks</h2>
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