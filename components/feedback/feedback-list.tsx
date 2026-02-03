"use client";

import React from "react";
import { Bug, Lightbulb, TrendingUp, HelpCircle, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/use-i18n";
import { FeedbackWithExpand, FeedbackType, FeedbackStatus } from "@/lib/pocketbase/services/feedbacks";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface FeedbackListProps {
  feedbacks: FeedbackWithExpand[];
  onSelect: (feedback: FeedbackWithExpand) => void;
  isLoading?: boolean;
  showSubmitter?: boolean; // 是否显示提交者信息（管理员视图）
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_CONFIG = {
  bug: { icon: Bug, color: "text-red-500" },
  feature: { icon: Lightbulb, color: "text-yellow-500" },
  improvement: { icon: TrendingUp, color: "text-blue-500" },
  other: { icon: HelpCircle, color: "text-gray-500" },
} as const;

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; labelEn: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "新建", labelEn: "New", variant: "default" },
  in_review: { label: "审核中", labelEn: "In Review", variant: "secondary" },
  planned: { label: "已计划", labelEn: "Planned", variant: "outline" },
  in_progress: { label: "进行中", labelEn: "In Progress", variant: "secondary" },
  completed: { label: "已完成", labelEn: "Completed", variant: "default" },
  declined: { label: "已拒绝", labelEn: "Declined", variant: "destructive" },
};

const TYPE_LABELS: Record<FeedbackType, { zh: string; en: string }> = {
  bug: { zh: "Bug 报告", en: "Bug Report" },
  feature: { zh: "功能建议", en: "Feature Request" },
  improvement: { zh: "改进意见", en: "Improvement" },
  other: { zh: "其他", en: "Other" },
};

// ============================================================================
// Component
// ============================================================================

export function FeedbackList({ feedbacks, onSelect, isLoading = false, showSubmitter = false }: FeedbackListProps) {
  const { locale } = useI18n();

  const listTitle = showSubmitter 
    ? (locale === "zh" ? "所有反馈" : "All Feedback")
    : (locale === "zh" ? "我的反馈" : "My Feedback");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{listTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{listTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {locale === "zh" ? "暂无反馈记录" : "No feedback yet"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{listTitle}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {feedbacks.map((feedback) => {
            const typeConfig = TYPE_CONFIG[feedback.type as keyof typeof TYPE_CONFIG];
            const statusConfig = STATUS_CONFIG[feedback.status];
            const Icon = typeConfig.icon;

            return (
              <div
                key={feedback.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onSelect(feedback)}
              >
                {/* Type Icon */}
                <div className={cn("flex-shrink-0", typeConfig.color)}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">
                      {locale === "zh" ? TYPE_LABELS[feedback.type].zh : TYPE_LABELS[feedback.type].en}
                    </span>
                    <Badge variant={statusConfig.variant} className="text-xs">
                      {locale === "zh" ? statusConfig.label : statusConfig.labelEn}
                    </Badge>
                    {showSubmitter && feedback.expand?.user && (
                      <span className="text-xs text-muted-foreground">
                        • {feedback.expand.user.name || feedback.expand.user.email}
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium truncate">{feedback.title || (locale === "zh" ? "无标题" : "No title")}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {feedback.description}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default FeedbackList;
