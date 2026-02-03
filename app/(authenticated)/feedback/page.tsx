"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MessageSquarePlus } from "lucide-react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useAuth } from "@/components/auth-provider";
import { feedbackService, FeedbackWithExpand } from "@/lib/pocketbase/services/feedbacks";
import { FeedbackForm, FeedbackFormData } from "@/components/feedback/feedback-form";
import { FeedbackList } from "@/components/feedback/feedback-list";
import { FeedbackDetailDialog } from "@/components/feedback/feedback-detail-dialog";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// Page Component
// ============================================================================

export default function FeedbackPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<FeedbackWithExpand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackWithExpand | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  // Load feedbacks - admin sees all, regular users see only their own
  const loadFeedbacks = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      let result;
      if (isAdmin) {
        // Admin sees all feedbacks
        result = await feedbackService.getAllFeedbacks();
      } else {
        // Regular user sees only their own
        result = await feedbackService.getByUser(user.id);
      }
      setFeedbacks(result.items);
    } catch (error) {
      console.error("Failed to load feedbacks:", error);
      toast({
        title: locale === "zh" ? "加载失败" : "Load Failed",
        description: locale === "zh" ? "加载反馈列表失败" : "Failed to load feedbacks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isAdmin, locale]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  // Handle form submission
  const handleSubmit = async (data: FeedbackFormData) => {
    if (!user?.id) {
      toast({
        title: locale === "zh" ? "错误" : "Error",
        description: locale === "zh" ? "请先登录" : "Please login first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await feedbackService.createFeedback({
        user: user.id,
        type: data.type,
        title: data.title,
        description: data.description,
        screenshots: data.screenshots,
      });

      toast({
        title: locale === "zh" ? "成功" : "Success",
        description: locale === "zh" ? "反馈提交成功！" : "Feedback submitted successfully!",
      });
      
      // Reload feedbacks
      await loadFeedbacks();
    } catch (error: any) {
      console.error("Failed to submit feedback:", error);
      toast({
        title: locale === "zh" ? "提交失败" : "Submission Failed",
        description: error.message || (locale === "zh" ? "提交失败" : "Submission failed"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle feedback selection
  const handleSelect = (feedback: FeedbackWithExpand) => {
    setSelectedFeedback(feedback);
    setDetailOpen(true);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <MessageSquarePlus className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">
              {locale === "zh" ? "用户反馈" : "User Feedback"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {locale === "zh"
                ? "提交功能建议、Bug 报告或改进意见，帮助我们改进系统"
                : "Submit feature requests, bug reports, or improvement suggestions to help us improve"}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback Form */}
        <div>
          <FeedbackForm onSubmit={handleSubmit} isLoading={isSubmitting} />
        </div>

        {/* Feedback List */}
        <div>
          <FeedbackList
            feedbacks={feedbacks}
            onSelect={handleSelect}
            isLoading={isLoading}
            showSubmitter={isAdmin}
          />
        </div>
      </div>

      {/* Detail Dialog */}
      <FeedbackDetailDialog
        feedback={selectedFeedback}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
