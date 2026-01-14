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
import { Copy, Flag, MessageCircle, Mail, MoreHorizontal, Trash2, CheckCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteRequest, closeRequest } from "@/app/actions"

// 定義 Props 類型
type RequestCardProps = {
  request: any
  currentUserId: string | undefined
}

export default function RequestCard({ request, currentUserId }: RequestCardProps) {
  const supabase = createClient()
  const isOwnRequest = currentUserId === request.user_id

  // 聯絡人資訊
  const contactMethod = request.profiles.contact_method
  const contactDetail = request.profiles.contact_detail
  
  // 舉報相關 State
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState("")
  // 移除圖片狀態
  const [isReporting, setIsReporting] = useState(false)

  // 生成預設訊息
  const messageTemplate = `Hi, I saw on Swap Platform that you have ${request.course_sections.course_code} (Group ${request.course_sections.group}). I am interested in swapping!`
  
  // 生成 WhatsApp 連結
  const getWhatsAppLink = () => {
    const cleanNumber = contactDetail.replace(/\D/g, '')
    const finalNumber = cleanNumber.length === 8 ? `852${cleanNumber}` : cleanNumber
    return `https://wa.me/${finalNumber}?text=${encodeURIComponent(messageTemplate)}`
  }

  // 複製訊息功能
  const copyToClipboard = () => {
    navigator.clipboard.writeText(messageTemplate)
    toast.success("訊息已複製到剪貼簿")
  }

  // 提交舉報邏輯 (已簡化：只傳送文字原因)
  const handleReport = async () => {
    if (!reportReason) return toast.error("請輸入舉報原因")
    setIsReporting(true)

    // 直接寫入 Database，不再上傳圖片
    const { error: dbError } = await supabase.from('reports').insert({
      reporter_id: currentUserId,
      target_request_id: request.id,
      reason: reportReason,
      evidence_image_path: null, // 這裡明確設為 null
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
    // 加入 overflow-visible 以修復 Dropdown 被遮擋的問題
    <Card className="shadow-sm hover:shadow-md transition-shadow group overflow-visible">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="secondary">{request.course_sections.course_code}</Badge>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {/* 修復 Date Error: 強制使用 YYYY-MM-DD 格式 */}
              {new Date(request.created_at).toLocaleDateString('en-CA')}
            </span>
            
            {/* 舉報按鈕 - 只有這不是自己的請求時才顯示 */}
            {!isOwnRequest && (
              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-300 hover:text-red-500">
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
                    {/* 移除了圖片上傳區塊 */}
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
          </div>
        </div>
        <CardTitle className="text-lg mt-2">
          持有: Group {request.course_sections.group}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <p>📅 {request.course_sections.day} {request.course_sections.time}</p>
          <p>📍 {request.course_sections.venue}</p>
          <hr className="my-2"/>
          <p className="font-semibold text-black">
            想要: {request.want_course_code} (Group {request.want_group})
          </p>
        </div>
        
        {isOwnRequest ? (
          <div className="flex gap-2">
            <Button variant="outline" className="w-full cursor-default hover:bg-background opacity-70">
              這是你的請求
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="text-green-600 focus:text-green-600 cursor-pointer"
                  onClick={async () => {
                    const res = await closeRequest(request.id)
                    if (res.error) toast.error(res.error)
                    else toast.success("已標記為完成！")
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  標記為已交換 (Close)
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                  onClick={async () => {
                    if(confirm("確定要刪除嗎？此操作無法復原。")) {
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
          </div>
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
                <DialogDescription>
                  請使用以下方式聯繫對方進行交換。
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-600 break-all">
                  {contactDetail}
                </div>
                
                <div className="space-y-2">
                  <Label>預設訊息模板</Label>
                  <div className="relative">
                    <Textarea readOnly value={messageTemplate} className="h-24 resize-none pr-10" />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={copyToClipboard}
                    >
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
                    <a href={`mailto:${contactDetail}?subject=Course Swap Request&body=${encodeURIComponent(messageTemplate)}`}>
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