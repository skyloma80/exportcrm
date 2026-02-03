"use client"

/**
 * New Feedback Page
 * 新建反馈页面
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useAuth } from "@/components/auth-provider"
import { feedbackService } from "@/lib/pocketbase/services/feedbacks"
import { FeedbackForm, FeedbackFormData } from "@/components/feedback/feedback-form"
import { useToast } from "@/hooks/use-toast"

export default function NewFeedbackPage() {
  const router = useRouter()
  const { locale } = useI18n()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: FeedbackFormData) => {
    if (!user?.id) {
      toast({
        title: locale === "zh" ? "错误" : "Error",
        description: locale === "zh" ? "请先登录" : "Please login first",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      await feedbackService.createFeedback({
        user: user.id,
        type: data.type,
        title: data.title,
        description: data.description,
        screenshots: data.screenshots,
      })

      toast({
        title: locale === "zh" ? "成功" : "Success",
        description: locale === "zh" ? "反馈提交成功！" : "Feedback submitted successfully!",
      })
      
      router.push("/feedbacks")
    } catch (error: any) {
      console.error("Failed to submit feedback:", error)
      toast({
        title: locale === "zh" ? "提交失败" : "Submission Failed",
        description: error.message || (locale === "zh" ? "提交失败" : "Submission failed"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/feedbacks")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {locale === "zh" ? "返回列表" : "Back to list"}
        </Button>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <MessageSquarePlus className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">
              {locale === "zh" ? "新建反馈" : "New Feedback"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {locale === "zh"
                ? "提交功能建议、Bug 报告或改进意见，帮助我们改进系统"
                : "Submit feature requests, bug reports, or improvement suggestions to help us improve"}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <FeedbackForm onSubmit={handleSubmit} isLoading={isSubmitting} />
    </div>
  )
}
