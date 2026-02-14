"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Users,
  Factory,
  Truck,
  Package,
  FolderKanban,
  Settings,
  Command,
  Calculator,
  MessageSquarePlus,
  HardDrive,
} from "lucide-react"

import { NavMain, NavGroup } from "@/components/layout/nav-main"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useAuth } from "@/components/auth-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// 简化的侧边栏菜单结构 - 以项目为中心的导航模式
// 保留：仪表盘、项目、客户、供应商、服务商、产品（只读全局视图）、托盘计算器、文件管理、设置
const baseNavGroups: NavGroup[] = [
  {
    labelKey: "", // 无标签，作为顶级菜单
    items: [
      { titleKey: "nav.dashboard", url: "/dashboard", icon: LayoutDashboard },
      { titleKey: "nav.projects", url: "/projects", icon: FolderKanban },
    ],
  },
  {
    labelKey: "nav.customerManagement",
    items: [
      { titleKey: "nav.customers", url: "/customers", icon: Users },
      { titleKey: "nav.customerTracking", url: "/customers-tracking", icon: Users },
    ],
  },
  {
    labelKey: "nav.supplierServiceProvider",
    items: [
      { titleKey: "nav.suppliers", url: "/suppliers", icon: Factory },
      { titleKey: "nav.serviceProviders", url: "/service-providers", icon: Truck },
    ],
  },
  {
    labelKey: "", // 无标签
    items: [
      { titleKey: "nav.products", url: "/products", icon: Package },
      { titleKey: "nav.disk", url: "/disk", icon: HardDrive },
      { titleKey: "nav.palletCalculator", url: "/pallet-calculator", icon: Calculator },
    ],
  },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { t } = useI18n()
  const { user } = useAuth()
  
  const isAdmin = user?.role === "admin"
  
  // Build nav groups based on user role
  const navGroups = React.useMemo(() => {
    const groups = [...baseNavGroups]
    
    // Add system menu group based on role
    const systemItems = []
    
    if (isAdmin) {
      // Admin sees settings
      systemItems.push({ titleKey: "nav.systemSettings", url: "/settings", icon: Settings })
    }
    
    // All users can view feedbacks (用户反馈)
    systemItems.push({ titleKey: "nav.feedback", url: "/feedbacks", icon: MessageSquarePlus })
    
    groups.push({
      labelKey: "",
      items: systemItems,
    })
    
    return groups
  }, [isAdmin])
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{t("sidebar.appName")}</span>
                  <span className="truncate text-xs text-muted-foreground">{t("sidebar.appDescription")}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
