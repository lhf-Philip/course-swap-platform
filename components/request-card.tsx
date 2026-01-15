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
import { Copy, Flag, MessageCircle, Mail, MoreHorizontal, Trash2, CheckCircle, Gem } from "lucide-react"
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

  const contactMethod = request.profiles.contact_method
  const contactDetail = request.profiles.contact_detail
  
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [isReporting, setIsReporting] = useState(false)

  // 處理 Want Groups (兼容舊數據)
  const wantGroups = request.want_groups || (request.want_group ? [request.want_group] : [])
  const wantString = wantGroups.join(" / ")

  const messageTemplate = `Hi, I saw on Swap Platform that you have ${request.course_sections.course_code} (Group ${request.course_sections.group}). I have ${wantString} and interested in swapping!`
  
  const getWhatsAppLink = () => {
    const cleanNumber = contactDetail.replace(/\D/g, '')
    const finalNumber = cleanNumber.length === 8 ? `852${cleanNumber}` : cleanNumber
    return `https://wa.me/${finalNumber}?text=${encodeURIComponent(messageTemplate)}`
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(messageTemplate)
    toast.success("訊息已複製到剪貼簿")
  }

  const handleReport = async () => {
    if (!reportReason) return toast.error("請輸入舉報原因")
    setIsReporting(true)

    const { error: dbError } = await supabase.from('reports').insert({
      reporter_id: currentUserId,
      target_request_id: request.id,
      reason: reportReason,
      status: 'PENDING'
    })

    if (dbError) {
      toast.error("舉報提交失敗")
    } else {
      toast.success("舉報已提交，管理員將會審核")
      setReportOpen(false)
      setReportReason("")
    }
    setIsReporting(false)
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow group overflow-visible h-full flex flex-col">
      <CardHeader className="pb-3 relative">
        <div className="flex justify-between items-start w-full">
          {/* 左側：科目編號 */}
          <div className="flex flex-col gap-1">
            <Badge variant="secondary" className="w-fit text-sm font-bold">
              {request.course_sections.course_code}
            </Badge>
            <span className="text-xs text-gray-400 pl-1">
              {new Date(request.created_at).toLocaleDateString('en-CA')}
            </span>
          </div>

          {/* 右側：操作按鈕 (三點 & 舉報) */}
          <div className="flex items-center gap-1 -mr-2"> {/* 負 margin 微調位置 */}
            {!isOwnRequest && (
              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-red-500">
                    <Flag size={14} />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>檢舉此請求</DialogTitle>
                    <DialogDescription>如發現虛假資訊或騷擾行為，請告知我們。</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>原因</Label>
                      <Textarea 
                        placeholder="請簡述原因..." 
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setReportOpen(false)}>取消</Button>
                    <Button variant="destructive" onClick={handleReport} disabled={isReporting}>
                      {isReporting ? "提交中..." : "確認檢舉"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {isOwnRequest && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-green-600 cursor-pointer"
                    onClick={async () => {
                      const res = await closeRequest(request.id)
                      if (res.error) toast.error(res.error)
                      else toast.success("已標記為完成！")
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    標記為已交換
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600 cursor-pointer"
                    onClick={async () => {
                      if(confirm("確定要刪除嗎？")) {
                         const res = await deleteRequest(request.id)
                         if (res.error) toast.error(res.error)
                         else toast.success("請求已刪除")
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    刪除請求
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <CardTitle className="text-xl mt-3 flex items-center gap-2">
          <span className="font-medium text-sm text-gray-500">持有:</span> 
          Group {request.course_sections.group}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-3 mb-4">
          <div className="text-sm text-gray-600 bg-slate-50 p-2 rounded border">
            <p>📅 {request.course_sections.day} {request.course_sections.time}</p>
            <p>📍 {request.course_sections.venue}</p>
          </div>
          
          <div className="space-y-1">
            <p className="font-semibold text-sm text-gray-500">想要 (Want):</p>
            <div className="flex flex-wrap gap-1">
              <span className="font-bold text-black mr-1">{request.want_course_code}</span>
              {wantGroups.includes('ANY') ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">ANY Group</Badge>
              ) : (
                wantGroups.map((g: string) => (
                  <Badge key={g} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {g}
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* 顯示報酬 */}
          {request.reward && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded text-sm font-medium">
              <Gem size={16} />
              <span>報酬: {request.reward}</span>
            </div>
          )}
        </div>
        
        {isOwnRequest ? (
          <Button variant="secondary" className="w-full cursor-not-allowed opacity-80">
            這是你的請求
          </Button>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full flex gap-2 items-center">
                {contactMethod === 'WhatsApp' ? <MessageCircle size={18}/> : <Mail size={18}/>}
                聯絡 {contactMethod}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>聯絡同學</DialogTitle>
                <DialogDescription>請使用以下方式聯繫對方。</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-600 break-all select-all">
                  {contactDetail}
                </div>
                {request.reward && (
                  <p className="text-sm text-amber-600">✨ 對方提供報酬: {request.reward}</p>
                )}
                <div className="space-y-2">
                  <Label>預設訊息模板</Label>
                  <div className="relative">
                    <Textarea readOnly value={messageTemplate} className="h-24 resize-none pr-10" />
                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-6 w-6" onClick={copyToClipboard}>
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter className="sm:justify-between gap-2">
                <Button variant="outline" onClick={copyToClipboard} className="w-full sm:w-auto">
                  <Copy className="mr-2 h-4 w-4"/> 複製訊息
                </Button>
                {contactMethod === 'WhatsApp' ? (
                  <Button asChild className="w-full sm:w-auto bg-[#25D366] hover:bg-[#128C7E]">
                    <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4"/> 開啟 WhatsApp
                    </a>
                  </Button>
                ) : (
                  <Button asChild className="w-full sm:w-auto">
                    <a href={`mailto:${contactDetail}?subject=Swap Request&body=${encodeURIComponent(messageTemplate)}`}>
                      <Mail className="mr-2 h-4 w-4"/> 發送郵件
                    </a>
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