"use client"

import { Button } from "@/components/ui/button"
import { BookOpen } from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"

export function HeaderDocsButton() {
  const { locale } = useI18n()

  // 暂时屏蔽帮助文档功能，文档需要更新
  const handleClick = () => {
    // const docUrl = locale === 'zh' ? '/docs/用户手册.html' : '/docs/UserManual_EN.html'
    // window.open(docUrl, '_blank')
  }

  // 暂时隐藏按钮
  return null

  // return (
  //   <Button
  //     variant="ghost"
  //     size="sm"
  //     onClick={handleClick}
  //     className="gap-2"
  //   >
  //     <BookOpen className="h-4 w-4" />
  //     <span className="hidden sm:inline">{locale === 'zh' ? '帮助文档' : 'Docs'}</span>
  //   </Button>
  // )
}
