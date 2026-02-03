"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { Bug, Lightbulb, TrendingUp, HelpCircle, MessageSquare, User, Image as ImageIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n/use-i18n";
import { FeedbackWithExpand, FeedbackType, FeedbackStatus } from "@/lib/pocketbase/services/feedbacks";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface FeedbackDetailDialogProps {
  feedback: FeedbackWithExpand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_CONFIG = {
  bug: { icon: Bug, color: "text-red-500", label: "Bug 报告", labelEn: "Bug Report" },
  feature: { icon: Lightbulb, color: "text-yellow-500", label: "功能建议", labelEn: "Feature Request" },
  improvement: { icon: TrendingUp, color: "text-blue-500", label: "改进意见", labelEn: "Improvement" },
  other: { icon: HelpCircle, color: "text-gray-500", label: "其他", labelEn: "Other" },
} as const;

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; labelEn: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "新建", labelEn: "New", variant: "default" },
  in_review: { label: "审核中", labelEn: "In Review", variant: "secondary" },
  planned: { label: "已计划", labelEn: "Planned", variant: "outline" },
  in_progress: { label: "进行中", labelEn: "In Progress", variant: "secondary" },
  completed: { label: "已完成", labelEn: "Completed", variant: "default" },
  declined: { label: "已拒绝", labelEn: "Declined", variant: "destructive" },
};

// ============================================================================
// Component
// ============================================================================

export function FeedbackDetailDialog({
  feedback,
  open,
  onOpenChange,
}: FeedbackDetailDialogProps) {
  const { locale } = useI18n();
  const dateLocale = locale === "zh" ? zhCN : enUS;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!feedback) return null;

  const typeConfig = TYPE_CONFIG[feedback.type as keyof typeof TYPE_CONFIG];
  const statusConfig = STATUS_CONFIG[feedback.status];
  const Icon = typeConfig.icon;

  const screenshots = feedback.screenshots || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className={cn("h-5 w-5", typeConfig.color)} />
              {feedback.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant={statusConfig.variant}>
                {locale === "zh" ? statusConfig.label : statusConfig.labelEn}
              </Badge>
              <span className="text-muted-foreground">
                {locale === "zh" ? typeConfig.label : typeConfig.labelEn}
              </span>
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

            {/* Screenshots */}
            {screenshots.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    {locale === "zh" ? "截图" : "Screenshots"} ({screenshots.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {screenshots.map((path, index) => (
                      <div
                        key={path}
                        className="aspect-video rounded-lg overflow-hidden border bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(`/api/disk/file?path=${encodeURIComponent(path)}`)}
                      >
                        <img
                          src={`/api/disk/file?path=${encodeURIComponent(path)}`}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-full object-cover"
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
                  <p className="text-sm whitespace-pre-wrap">
                    {feedback.admin_response}
                  </p>
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal - Full Screen */}
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
    </>
  );
}

export default FeedbackDetailDialog;
