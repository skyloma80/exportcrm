import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { I18nProvider } from "@/lib/i18n/provider"
import { Toaster } from "@/components/ui/toaster"

// 全站强制动态渲染：认证路由在构建时无登录态，若被静态预渲染会产出空页面
// 并被长期缓存（s-maxage=1年），导致直接访问 URL 时显示错误内容。
// 内部 CRM 无需静态优化，全部请求走服务端动态渲染。
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Next.js + PocketBase Template",
  description: "A clean Next.js template with PocketBase authentication",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <I18nProvider>
            <AuthProvider>{children}</AuthProvider>
          </I18nProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
