"use client"

import { useState, useEffect, useMemo } from "react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BookOpen, Loader2, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface TocItem {
  id: string
  title: string
  level: number
}

export default function HelpPage() {
  const { locale } = useI18n()
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState("")

  useEffect(() => {
    const loadDoc = async () => {
      setLoading(true)
      try {
        const file = locale === "zh" ? "USER_MANUAL_CN.md" : "USER_MANUAL_EN.md"
        const res = await fetch(`/docs/${file}`)
        if (res.ok) {
          const text = await res.text()
          setContent(text)
        }
      } catch (err) {
        console.error("Failed to load docs:", err)
      } finally {
        setLoading(false)
      }
    }
    loadDoc()
  }, [locale])

  // 从 markdown 提取目录（只提取带数字编号的章节）
  const toc = useMemo(() => {
    const items: TocItem[] = []
    const lines = content.split("\n")
    for (const line of lines) {
      const match = line.match(/^(#{2})\s+(\d+\..*|附录.*)$/m)
      if (match) {
        const level = match[1].length
        const title = match[2].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        const id = title
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
          .replace(/^-|-$/g, "")
        items.push({ id, title, level })
      }
    }
    return items
  }, [content])

  // 过滤掉目录章节的内容
  const filteredContent = useMemo(() => {
    // 移除 "## 目录" 或 "## Table of Contents" 到下一个 ## 之间的内容
    return content
      .replace(/## 目录[\s\S]*?(?=## \d+\.)/m, "")
      .replace(/## Table of Contents[\s\S]*?(?=## \d+\.)/m, "")
  }, [content])

  // 设置默认激活项
  useEffect(() => {
    if (toc.length > 0 && !activeSection) {
      setActiveSection(toc[0].id)
    }
  }, [toc, activeSection])

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="p-6 h-[calc(100vh-64px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          {locale === "zh" ? "用户操作手册" : "User Manual"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">AlustarsCRM</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex gap-6 h-[calc(100%-60px)]">
          {/* 左侧目录 */}
          <Card className="w-72 shrink-0">
            <CardContent className="p-0">
              <div className="p-3 border-b">
                <h2 className="font-semibold text-sm text-muted-foreground">
                  {locale === "zh" ? "目录" : "Contents"}
                </h2>
              </div>
              <ScrollArea className="h-[calc(100vh-220px)]">
                <nav className="p-2">
                  {toc.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1",
                        activeSection === item.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </button>
                  ))}
                </nav>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* 右侧内容 */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full">
              <ScrollArea className="h-[calc(100vh-180px)] p-6">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <MarkdownRenderer content={filteredContent} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function MarkdownRenderer({ content }: { content: string }) {
  // 为标题添加 id
  const addIds = (text: string) => {
    return text.replace(/^(#{1,3})\s+(.+)$/gm, (match, hashes, title) => {
      const id = title
        .toLowerCase()
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
        .replace(/^-|-$/g, "")
      return `${hashes} <span id="${id}"></span>${title}`
    })
  }

  const html = addIds(content)
    // 标题
    .replace(
      /^#\s+<span id="([^"]+)"><\/span>(.+)$/gm,
      '<h1 id="$1" class="text-2xl font-bold mt-8 mb-4 pb-2 border-b scroll-mt-4">$2</h1>'
    )
    .replace(
      /^##\s+<span id="([^"]+)"><\/span>(.+)$/gm,
      '<h2 id="$1" class="text-xl font-bold mt-8 mb-3 text-primary scroll-mt-4">$2</h2>'
    )
    .replace(
      /^###\s+<span id="([^"]+)"><\/span>(.+)$/gm,
      '<h3 id="$1" class="text-lg font-semibold mt-6 mb-2 scroll-mt-4">$2</h3>'
    )
    .replace(/^####\s+(.+)$/gm, '<h4 class="font-semibold mt-4 mb-1">$1</h4>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // 行内代码
    .replace(
      /`([^`\n]+)`/g,
      '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>'
    )
    // 代码块
    .replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4 text-sm"><code>$1</code></pre>'
    )
    // 引用
    .replace(
      /^>\s+(.+)$/gm,
      '<blockquote class="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 pl-4 py-2 my-3 text-sm">$1</blockquote>'
    )
    // 图片
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="rounded-lg border shadow-sm my-4 max-w-full" />'
    )
    // 链接
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-primary hover:underline">$1</a>'
    )
    // 表格处理
    .replace(/\|(.+)\|/g, (match, content) => {
      if (match.includes("---")) return ""
      const cells = content.split("|").map((c: string) => c.trim())
      return `<tr>${cells.map((c: string) => `<td class="border border-border px-3 py-2">${c}</td>`).join("")}</tr>`
    })
    // 有序列表
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-6 list-decimal">$1</li>')
    // 无序列表
    .replace(/^[-*]\s+(.+)$/gm, '<li class="ml-6 list-disc">$1</li>')
    // 分隔线
    .replace(/^---$/gm, '<hr class="my-6 border-border" />')
    // 段落
    .replace(/\n\n/g, "</p><p class=\"my-3\">")

  // 包装表格
  const withTables = html.replace(
    /(<tr>[\s\S]*?<\/tr>)+/g,
    '<table class="w-full border-collapse my-4">$&</table>'
  )

  return <div dangerouslySetInnerHTML={{ __html: withTables }} />
}
