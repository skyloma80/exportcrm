"use client"

/**
 * Feedback Detail Page
 * 反馈详情页
 */

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useAuth } from "@/components/auth-provider"
import { 
  ArrowLeft,
  Bug,
  Lightbulb,
  TrendingUp,
  HelpCircle,
  MessageSquare,
  User,
  Image as ImageIcon,
  X,
  Pencil,
} from "lucide-react"
import { FeedbackWithExpand, FeedbackStatus } from "@/lib/pocketbase/services/feedbacks"
import { format } from "date-fns"
import { zhCN, enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"

// Type config
const TYPE_CONFIG = {
  bug: { icon: Bug, color: "text-red-500", label: "Bug 报告", labelEn: "Bug Report" },
  feature: { icon: Lightbulb, color: "text-yellow-500", label: "功能建议", labelEn: "Feature Request" },
  improvement: { icon: TrendingUp, color: "text-blue-500", label: "改进意见", labelEn: "Improvement" },
  other: { icon: HelpCircle, color: "text-gray-500", label: "其他", labelEn: "Other" },
} as const

// Status config
const STATUS_CONFIG: Record<FeedbackStatus, { label: string; labelEn: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "新建", labelEn: "New", variant: "default" },
  in_review: { label: "审核中", labelEn: "In Review", variant: "secondary" },
  planned: { label: "已计划", labelEn: "Planned", variant: "outline" },
  in_progress: { label: "进行中", labelEn: "In Progress", variant: "secondary" },
  completed: { label: "已完成", labelEn: "Completed", variant: "default" },
  declined: { label: "已拒绝", labelEn: "Declined", variant: "destructive" },
}

export default function FeedbackDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { locale } = useI18n()
  const { user } = useAuth()
  const dateLocale = locale === "zh" ? zhCN : enUS
  
  const isAdmin = user?.role === "admin"
  const id = params.id as string

  const [feedback, setFeedback] = useState<FeedbackWithExpand | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    if (id) loadFeedback()
  }, [id])

  const loadFeedback = async () => {
    try {
      const pb = getPocketBase()
      const result = await pb.collection("feedbacks").getOne<FeedbackWithExpand>(id, {
        expand: "user,responded_by",
      })
      setFeedback(result)
    } catch (err) {
      console.error("Error loading feedback:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!feedback) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              {locale === "zh" ? "反馈未找到" : "Feedback not found"}
            </p>
            <Button variant="outline" onClick={() => router.push("/feedbacks")} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {locale === "zh" ? "返回列表" : "Back to list"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const typeConfig = TYPE_CONFIG[feedback.type as keyof typeof TYPE_CONFIG]
  const statusConfig = STATUS_CONFIG[feedback.status]
  const Icon = typeConfig.icon
  const screenshots = feedback.screenshots || []

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/feedbacks")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {locale === "zh" ? "返回列表" : "Back to list"}
        </Button>
        {isAdmin && (
          <Button onClick={() => router.push(`/feedbacks/${id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            {locale === "zh" ? "处理反馈" : "Handle Feedback"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Icon className={cn("h-6 w-6", typeConfig.color)} />
            <div className="flex-1">
              <CardTitle>{feedback.title || (locale === "zh" ? "无标题" : "No title")}</CardTitle>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span>{locale === "zh" ? typeConfig.label : typeConfig.labelEn}</span>
                <Badge variant={statusConfig.variant}>
                  {locale === "zh" ? statusConfig.label : statusConfig.labelEn}
                </Badge>
                <span>
                  {format(new Date(feedback.created), "PPP", { locale: dateLocale })}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Submitter */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              {locale === "zh" ? "提交者" : "Submitter"}
            </h4>
            <p className="text-sm text-muted-foreground">
              {feedback.expand?.user?.name || feedback.expand?.user?.email || (locale === "zh" ? "匿名用户" : "Anonymous")}
            </p>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h4 className="font-medium mb-2">
              {locale === "zh" ? "详细描述" : "Description"}
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {feedback.description}
            </p>
          </div>

          {/* Screenshots - 一行一张大图展示 */}
          {screenshots.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {locale === "zh" ? "截图" : "Screenshots"} ({screenshots.length})
                </h4>
                <div className="space-y-4">
                  {screenshots.map((path, index) => (
                    <div
                      key={path}
                      className="rounded-lg overflow-hidden border bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedImage(`/api/disk/file?path=${encodeURIComponent(path)}`)}
                    >
                      <img
                        src={`/api/disk/file?path=${encodeURIComponent(path)}`}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Admin Response */}
          {feedback.admin_response && (
            <>
              <Separator />
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {locale === "zh" ? "管理员回复" : "Admin Response"}
                </h4>
                <p className="text-sm whitespace-pre-wrap">{feedback.admin_response}</p>
                {feedback.expand?.responded_by && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {feedback.expand.responded_by.name}
                    {feedback.responded_at && (
                      <span className="ml-2">
                        {format(new Date(feedback.responded_at), "PPP", { locale: dateLocale })}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-[95vw] max-h-[95vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
