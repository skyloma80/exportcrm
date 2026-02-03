import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/pocketbase/middleware"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/ (API routes)
     * - _next/ (all Next.js internal paths including webpack-hmr, static, image, etc.)
     * - favicon.ico (favicon file)
     * - public folder (static assets)
     */
    "/((?!api/|_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
