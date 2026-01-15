'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function deleteRequest(requestId: string) {
  const supabase = await createClient()
  
  // RLS 已經限制了只能刪除自己的，所以這裡直接 delete 即可
  const { error } = await supabase
    .from('swap_requests')
    .delete()
    .eq('id', requestId)

  if (error) return { error: error.message }
  
  revalidatePath('/') // 刷新首頁
  revalidatePath('/matches') // 刷新匹配頁
  return { success: true }
}

export async function closeRequest(requestId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('swap_requests')
    .update({ status: 'CLOSED' })
    .eq('id', requestId)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/matches')
  return { success: true }
}

export async function revalidateAll() {
  revalidatePath('/', 'layout') // 清除所有頁面的緩存
}