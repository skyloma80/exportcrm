/**
 * PocketBase 中间件
 * 
 * 处理认证状态检查和路由保护
 * 
 * 从主项目复制，保持一致性
 */

import { NextResponse, type NextRequest } from "next/server";
import PocketBase from "pocketbase";

const PUBLIC_PATHS = ["/login", "/register", "/"];

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 跳过 Next.js 内部路径
  if (pathname.startsWith("/_next/")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  // 从 cookie 获取认证状态
  const pbAuth = request.cookies.get("pb_auth")?.value;

  let isAuthenticated = false;

  if (pbAuth) {
    try {
      const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
      pb.authStore.loadFromCookie(`pb_auth=${pbAuth}`);
      isAuthenticated = pb.authStore.isValid;

      // 如果 token 即将过期，尝试刷新
      if (isAuthenticated && pb.authStore.token) {
        try {
          await pb.collection("users").authRefresh();
          // 更新 cookie（secure 必须与实际协议一致，HTTP 下 Secure cookie 会被浏览器丢弃）
          const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
          const isHttps = proto === "https";
          const newCookie = pb.authStore.exportToCookie({
            httpOnly: false,
            secure: isHttps,
            sameSite: "Lax",
          });
          response.headers.set("Set-Cookie", newCookie);
        } catch {
          // 刷新失败，清除认证
          isAuthenticated = false;
        }
      }
    } catch {
      isAuthenticated = false;
    }
  }

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // 未登录访问受保护路由 → 重定向到登录页
  if (!isAuthenticated && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 已登录访问登录/注册页 → 重定向到仪表板
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
