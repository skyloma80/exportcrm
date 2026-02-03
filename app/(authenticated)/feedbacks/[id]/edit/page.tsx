"use client"

/**
 * Feedback Edit Page (Admin Only)
 * 反馈编辑页 - 仅管理员可以修改状态和回复
 */

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { 
  ArrowLeft,
  Bug,
  Lightbulb,
  TrendingUp,
  HelpCircle,
  Save,
  User,
  Image as ImageIcon,
  X,
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

// Status options
const STATUS_OPTIONS: { value: FeedbackStatus; label: string; labelEn: string }[] = [
  { value: "new", label: "新建", labelEn: "New" },
  { value: "in_review", label: "审核中", labelEn: "In Review" },
  { value: "planned", label: "已计划", labelEn: "Planned" },
  { value: "in_progress", label: "进行中", labelEn: "In Progress" },
  { value: "completed", label: "已完成", labelEn: "Completed" },
  { value: "declined", label: "已拒绝", labelEn: "Declined" },
]

export default function FeedbackEditPage() {
  const router = useRouter()
  const params = useParams()
  const { locale } = useI18n()
  const { user } = useAuth()
  const { toast } = useToast()
  const dateLocale = locale === "zh" ? zhCN : enUS
  
  const isAdmin = user?.role === "admin"
  const id = params.id as string

  const [feedback, setFeedback] = useState<FeedbackWithExpand | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Form state
  const [status, setStatus] = useState<FeedbackStatus>("new")
  const [adminResponse, setAdminResponse] = useState("")

  useEffect(() => {
    if (id) loadFeedback()
  }, [id])

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && !isAdmin) {
      toast({
        title: locale === "zh" ? "无权限" : "No Permission",
        description: locale === "zh" ? "只有管理员可以编辑反馈" : "Only admins can edit feedback",
        variant: "destructive",
      })
      router.push(`/feedbacks/${id}`)
    }
  }, [loading, isAdmin, id, router, locale, toast])

  const loadFeedback = async () => {
    try {
      const pb = getPocketBase()
      const result = await pb.collection("feedbacks").getOne<FeedbackWithExpand>(id, {
        expand: "user,responded_by",
      })
      setFeedback(result)
      setStatus(result.status)
      setAdminResponse(result.admin_response || "")
    } catch (err) {
      console.error("Error loading feedback:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!feedback || !user) return

    setSaving(true)
    try {
      const pb = getPocketBase()
      await pb.collection("feedbacks").update(id, {
        status,
        admin_response: adminResponse,
        responded_by: user.id,
        responded_at: new Date().toISOString(),
      })

      toast({
        title: locale === "zh" ? "保存成功" : "Saved",
        description: locale === "zh" ? "反馈状态已更新" : "Feedback status updated",
      })
      router.push(`/feedbacks/${id}`)
    } catch (err: any) {
      console.error("Error saving feedback:", err)
      toast({
        title: locale === "zh" ? "保存失败" : "Save Failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!feedback || !isAdmin) {
    return null
  }

  const typeConfig = TYPE_CONFIG[feedback.type as keyof typeof TYPE_CONFIG]
  const Icon = typeConfig.icon
  const screenshots = feedback.screenshots || []

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push(`/feedbacks/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {locale === "zh" ? "返回详情" : "Back to detail"}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving 
            ? (locale === "zh" ? "保存中..." : "Saving...") 
            : (locale === "zh" ? "保存" : "Save")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Icon className={cn("h-6 w-6", typeConfig.color)} />
              <div>
                <CardTitle>{feedback.title || (locale === "zh" ? "无标题" : "No title")}</CardTitle>
                <CardDescription>
                  {locale === "zh" ? typeConfig.label : typeConfig.labelEn} • 
                  {format(new Date(feedback.created), "PPP", { locale: dateLocale })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Submitter */}
            <div>
              <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
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
              <h4 className="text-sm font-medium mb-1">
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
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    {locale === "zh" ? "截图" : "Screenshots"} ({screenshots.length})
                  </h4>
                  <div className="space-y-3">
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
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{locale === "zh" ? "处理反馈" : "Handle Feedback"}</CardTitle>
            <CardDescription>
              {locale === "zh" ? "更新状态并回复用户" : "Update status and respond to user"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status */}
            <div className="space-y-2">
              <Label>{locale === "zh" ? "状态" : "Status"}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as FeedbackStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {locale === "zh" ? opt.label : opt.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admin Response */}
            <div className="space-y-2">
              <Label>{locale === "zh" ? "管理员回复" : "Admin Response"}</Label>
              <Textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder={locale === "zh" ? "输入回复内容..." : "Enter your response..."}
                rows={6}
              />
            </div>

            {/* Previous Response Info */}
            {feedback.responded_at && feedback.expand?.responded_by && (
              <div className="text-xs text-muted-foreground">
                {locale === "zh" ? "上次回复：" : "Last response: "}
                {feedback.expand.responded_by.name} • 
                {format(new Date(feedback.responded_at), "PPP", { locale: dateLocale })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
