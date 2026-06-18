"use client"

import { type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useI18n } from "@/lib/i18n/use-i18n"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export interface NavItem {
  titleKey: string
  url: string
  icon: LucideIcon
  external?: boolean
}

export interface NavGroup {
  labelKey: string
  items: NavItem[]
}

interface NavMainProps {
  groups: NavGroup[]
}

export function NavMain({ groups }: NavMainProps) {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <>
      {groups.map((group, index) => (
        <SidebarGroup key={group.labelKey || `group-${index}`}>
          {group.labelKey && <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>}
          <SidebarMenu>
            {group.items.map((item) => {
              const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`)
              
              return (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={t(item.titleKey)}>
                    {item.external ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <item.icon />
                        <span>{t(item.titleKey)}</span>
                      </a>
                    ) : (
                      <Link href={item.url}>
                        <item.icon />
                        <span>{t(item.titleKey)}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
