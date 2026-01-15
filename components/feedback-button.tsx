'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { Bug } from "lucide-react"

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!msg.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase.from('feedbacks').insert({
      user_id: user?.id,
      message: msg
    })

    if (error) {
      toast.error("Failed to send feedback.")
    } else {
      toast.success("Thank you for your feedback!")
      setOpen(false)
      setMsg("")
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-500 gap-2">
          <Bug size={16}/> Report Bug
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Feedback / Bug Report</DialogTitle>
          <DialogDescription>
            If you see any bug or have any suggestions, feel free to drop me a message here. Your feedback helps improve the platform!
          </DialogDescription>
        </DialogHeader>
        <Textarea 
          value={msg} 
          onChange={(e) => setMsg(e.target.value)} 
          placeholder="Describe the issue or idea..." 
          className="min-h-[100px]"
        />
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Sending..." : "Send Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}