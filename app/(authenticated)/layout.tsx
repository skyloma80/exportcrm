"use client"

import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { HeaderLanguageSwitcher } from "@/components/layout/header-language-switcher"
import { HeaderDocsButton } from "@/components/layout/header-docs-button"
import { HeaderUserMenu } from "@/components/layout/header-user-menu"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname, useSearchParams } from "next/navigation"
import { BreadcrumbProvider, useBreadcrumb } from "@/lib/breadcrumb/context"
import { useI18n } from "@/lib/i18n/use-i18n"
import Link from "next/link"
import React from "react"
import { projectService, type ProjectWithRelations } from "@/lib/pocketbase/services/projects"
import { customerService, type Customer } from "@/lib/pocketbase/services/customers"

/**
 * Project context with customer information for breadcrumb
 */
interface ProjectContextForBreadcrumb {
  project: ProjectWithRelations
  customer: Customer | null
}

/**
 * BreadcrumbNav Component - 简化版，无图标
 */
function BreadcrumbNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { items } = useBreadcrumb()
  const { t, locale } = useI18n()
  
  const [projectContext, setProjectContext] = useState<ProjectContextForBreadcrumb | null>(null)
  const projectIdFromUrl = searchParams.get('project')
  
  // 加载项目和客户信息
  useEffect(() => {
    if (projectIdFromUrl) {
      projectService.getWithRelations(projectIdFromUrl)
        .then(async (project) => {
          if (project) {
            let customer = project.expand?.customer || null
            if (!customer && project.customer) {
              try {
                customer = await customerService.getOne(project.customer)
              } catch (error) {
                console.error("Error loading customer for breadcrumb:", error)
              }
            }
            setProjectContext({ project, customer })
          } else {
            setProjectContext(null)
          }
        })
        .catch(() => setProjectContext(null))
    } else {
      setProjectContext(null)
    }
  }, [projectIdFromUrl])

  const getCustomerDisplayName = (customer: Customer) => {
    return locale === 'zh' && customer.name_cn ? customer.name_cn : customer.name
  }

  const getProjectDisplayName = (project: ProjectWithRelations) => {
    return locale === 'zh' && project.name_cn ? project.name_cn : project.name
  }

  // 第一种方式：页面设置了自定义 items
  if (items.length > 0) {
    const breadcrumbItems: { label: string; href?: string }[] = []
    
    if (projectContext) {
      if (projectContext.customer) {
        breadcrumbItems.push({
          label: getCustomerDisplayName(projectContext.customer),
          href: `/customers/${projectContext.customer.id}`
        })
      }
      breadcrumbItems.push({
        label: getProjectDisplayName(projectContext.project),
        href: `/projects/${projectContext.project.id}`
      })
    }
    
    breadcrumbItems.push(...items)
    
    return (
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {item.href && index < breadcrumbItems.length - 1 ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  // 第二种方式：从 pathname 自动生成
  const segments = pathname.split('/').filter(Boolean)
  
  const getSegmentLabel = (segment: string) => {
    const labelMap: Record<string, string> = {
      'dashboard': t('nav.dashboard'),
      'items': t('nav.items'),
      'disk': t('nav.disk'),
      'customers': t('nav.customers'),
      'suppliers': t('nav.suppliers'),
      'service-providers': t('nav.serviceProviders'),
      'products': t('nav.products'),
      'projects': t('nav.projects'),

      'purchase-orders': t('nav.purchaseOrders'),
      'po': t('nav.purchaseOrders'),
      'quotations': t('nav.quotations'),
      'orders': t('nav.orders'),
      'invoices': t('nav.invoices'),
      'shipments': t('nav.shipments'),
      'pallet-calculator': t('nav.palletCalculator'),
      'payments': t('nav.payments'),
      'settings': t('nav.settings'),
      'tasks': t('nav.tasks'),
      'new': t('common.new') || 'New',
      'edit': t('common.edit') || 'Edit',
    }
    return labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
  }

  const breadcrumbItems: { label: string; href: string; isLast: boolean }[] = []
  
  // 添加项目上下文
  if (projectContext && !pathname.startsWith('/projects/')) {
    if (projectContext.customer) {
      breadcrumbItems.push({
        label: getCustomerDisplayName(projectContext.customer),
        href: `/customers/${projectContext.customer.id}`,
        isLast: false
      })
    }
    breadcrumbItems.push({
      label: getProjectDisplayName(projectContext.project),
      href: `/projects/${projectContext.project.id}`,
      isLast: false
    })
  }
  
  // 添加路径面包屑
  segments.forEach((segment, index) => {
    breadcrumbItems.push({
      label: getSegmentLabel(segment),
      href: '/' + segments.slice(0, index + 1).join('/'),
      isLast: index === segments.length - 1
    })
  })
  
  // 更新 isLast
  if (breadcrumbItems.length > 0) {
    breadcrumbItems.forEach((item, index) => {
      item.isLast = index === breadcrumbItems.length - 1
    })
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={item.href + index}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <BreadcrumbProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <BreadcrumbNav />
            <div className="ml-auto flex items-center gap-2">
              <HeaderDocsButton />
              <HeaderLanguageSwitcher />
              <Separator orientation="vertical" className="h-4" />
              <HeaderUserMenu 
                user={{
                  name: user?.name || '',
                  email: user?.email || '',
                  avatar: user?.avatar,
                }} 
              />
            </div>
          </header>
          <div className="flex flex-1 flex-col">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </BreadcrumbProvider>
  )
}
