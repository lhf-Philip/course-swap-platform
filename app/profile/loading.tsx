import Navbar from "@/components/navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto py-10 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側 Skeleton */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader><Skeleton className="h-8 w-32" /></CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
          {/* 右側 Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}