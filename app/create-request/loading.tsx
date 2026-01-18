import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
        <Skeleton className="h-[600px] w-full rounded-xl" />
    </div>
  )
}