import { loginWithMicrosoft } from './actions' // 引入新的 action
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Card className="w-[350px]">
        <CardHeader className="text-center">
          <CardTitle>Swap 科平台</CardTitle>
          <CardDescription>
            使用學校 Microsoft 帳號登入<br/>
            (CPCE / PolyU)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginWithMicrosoft}>
            <Button className="w-full flex items-center gap-2" variant="outline">
              {/* Microsoft Logo SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              Login with Microsoft
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}