'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { Copy, Flag, MessageCircle, Mail, MoreHorizontal, Trash2, CheckCircle, Gem, ArrowRightLeft } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteRequest, closeRequest } from "@/app/actions"

type RequestCardProps = {
  request: any
  currentUserId: string | undefined
}

export default function RequestCard({ request, currentUserId }: RequestCardProps) {
  const supabase = createClient()
  const isOwnRequest = currentUserId === request.user_id

  const contactMethod = request.profiles?.contact_method || 'Email'
  const contactDetail = request.profiles?.contact_detail || request.profiles?.email || 'No contact info'
  
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState("")

  // === 關鍵修改：讀取新的 JSON 結構 ===
  const haves = request.have_details || []
  const wants = request.wants || []
  // ===================================

  const messageTemplate = `Hi, I saw your swap request on the platform. I'm interested in trading!`
  
  const getWhatsAppLink = () => {
    const cleanNumber = contactDetail.replace(/\D/g, '')
    const finalNumber = cleanNumber.length === 8 ? `852${cleanNumber}` : cleanNumber
    return `https://wa.me/${finalNumber}?text=${encodeURIComponent(messageTemplate)}`
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(messageTemplate)
    toast.success("Copied!")
  }

  const handleReport = async () => {
    if (!reportReason) return toast.error("Please enter a reason")
    const { error } = await supabase.from('reports').insert({
      reporter_id: currentUserId,
      target_request_id: request.id,
      reason: reportReason,
      status: 'PENDING'
    })
    if (error) toast.error("Failed")
    else {
      toast.success("Reported")
      setReportOpen(false)
    }
  }

  return (
    // overflow-visible: 讓下拉選單能顯示
    // h-auto: 讓高度自動適應內容，不要強制拉長
    <Card className="shadow-sm hover:shadow-md transition-shadow group overflow-visible h-auto flex flex-col relative bg-white">
      <CardHeader className="pb-3 flex flex-row justify-between items-start space-y-0">
        <span className="text-xs text-gray-400">
          {new Date(request.created_at).toLocaleDateString('en-CA')}
        </span>

        <div className="absolute top-3 right-3 flex gap-1">
          {!isOwnRequest && (
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-red-500">
                  <Flag size={14} />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Report</DialogTitle></DialogHeader>
                <Textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Reason..." />
                <Button onClick={handleReport} variant="destructive">Submit</Button>
              </DialogContent>
            </Dialog>
          )}

          {isOwnRequest && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => closeRequest(request.id)} className="text-green-600">
                  <CheckCircle className="mr-2 h-4 w-4"/> Mark as Done
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { if(confirm('Delete?')) deleteRequest(request.id) }} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4"/> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Have List */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-1">HAVE:</p>
          <div className="space-y-2">
            {haves.length > 0 ? haves.map((h: any, i: number) => (
              <div key={i} className="bg-slate-50 border p-2 rounded text-sm flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="font-bold">{h.code}</Badge>
                {/* 顯示手動輸入的 Group */}
                <span className="text-gray-800 font-medium">{h.group}</span>
              </div>
            )) : (
              <p className="text-xs text-red-400">No details (Old data)</p>
            )}
          </div>
        </div>

        <div className="flex justify-center text-gray-300"><ArrowRightLeft size={16} /></div>

        {/* Want List */}
        <div>
          <p className="text-xs font-bold text-blue-500 mb-1">WANT:</p>
          <div className="space-y-2">
            {wants.map((w: any, i: number) => (
              <div key={i} className="border border-blue-100 bg-blue-50 p-2 rounded text-sm">
                <div className="font-bold text-blue-800">{w.code}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {w.groups.map((g: string) => (
                    <Badge key={g} variant="outline" className="bg-white text-blue-600 border-blue-200 text-[10px] h-5">
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {request.reward && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded text-sm font-medium border border-amber-100 mt-2">
            <Gem size={16} />
            <span>Reward: {request.reward}</span>
          </div>
        )}

        {!isOwnRequest && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full mt-3 gap-2">
                {contactMethod === 'WhatsApp' ? <MessageCircle size={16}/> : <Mail size={16}/>}
                Contact {contactMethod}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Contact Info</DialogTitle></DialogHeader>
              <div className="p-4 bg-slate-50 rounded text-center text-lg font-medium break-all select-all">
                {contactDetail}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={copyToClipboard}><Copy className="mr-2 h-4 w-4"/> Copy Msg</Button>
                {contactMethod === 'WhatsApp' && (
                  <Button asChild className="bg-[#25D366] hover:bg-[#128C7E]">
                    <a href={getWhatsAppLink()} target="_blank">Open WhatsApp</a>
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}