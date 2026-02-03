"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { Bug, Lightbulb, TrendingUp, HelpCircle, Loader2, User, ChevronRight, X, Image as ImageIcon, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { feedbackService, FeedbackWithExpand, FeedbackStatus, FeedbackType } from "@/lib/pocketbase/services/feedbacks";
import { cn } from "@/lib/utils";

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

const STATUS_OPTIONS: FeedbackStatus[] = ["new", "in_review", "planned", "in_progress", "completed", "declined"];

// ============================================================================
// Component
// ============================================================================

export function FeedbackManagement() {
  const { locale, t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const dateLocale = locale === "zh" ? zhCN : enUS;

  const [feedbacks, setFeedbacks] = useState<FeedbackWithExpand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackWithExpand | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Status update state
  const [newStatus, setNewStatus] = useState<FeedbackStatus | "">("");
  const [adminResponse, setAdminResponse] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Load all feedbacks
  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    setIsLoading(true);
    try {
      const result = await feedbackService.getAllFeedbacks({ perPage: 100 });
      setFeedbacks(result.items);
    } catch (error) {
      console.error("Failed to load feedbacks:", error);
      toast({
        title: locale === "zh" ? "加载失败" : "Load Failed",
        description: locale === "zh" ? "无法加载反馈列表" : "Failed to load feedback list",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFeedback = (feedback: FeedbackWithExpand) => {
    setSelectedFeedback(feedback);
    setNewStatus(feedback.status);
    setAdminResponse(feedback.admin_response || "");
    setIsDetailOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedFeedback || !newStatus) return;

    setIsUpdating(true);
    try {
      await feedbackService.updateStatus(
        selectedFeedback.id,
        newStatus,
        adminResponse || undefined,
        user?.id
      );
      
      toast({
        title: locale === "zh" ? "更新成功" : "Updated",
        description: locale === "zh" ? "反馈状态已更新" : "Feedback status updated",
      });
      
      setIsDetailOpen(false);
      loadFeedbacks();
    } catch (error) {
      console.error("Failed to update feedback:", error);
      toast({
        title: locale === "zh" ? "更新失败" : "Update Failed",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{locale === "zh" ? "用户反馈管理" : "Feedback Management"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{locale === "zh" ? "用户反馈管理" : "Feedback Management"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {feedbacks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {locale === "zh" ? "暂无反馈记录" : "No feedback yet"}
            </div>
          ) : (
            <div className="divide-y">
              {feedbacks.map((feedback) => {
                const typeConfig = TYPE_CONFIG[feedback.type as keyof typeof TYPE_CONFIG];
                const statusConfig = STATUS_CONFIG[feedback.status];
                const Icon = typeConfig?.icon || HelpCircle;

                return (
                  <div
                    key={feedback.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectFeedback(feedback)}
                  >
                    <div className={cn("flex-shrink-0", typeConfig?.color || "text-gray-500")}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={statusConfig.variant} className="text-xs">
                          {locale === "zh" ? statusConfig.label : statusConfig.labelEn}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {locale === "zh" ? typeConfig?.label : typeConfig?.labelEn}
                        </span>
                        {feedback.expand?.user && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {feedback.expand.user.name || feedback.expand.user.email}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium truncate">{feedback.title || (locale === "zh" ? "无标题" : "No title")}</h4>
                      <p className="text-sm text-muted-foreground truncate">{feedback.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFeedback && TYPE_CONFIG[selectedFeedback.type as keyof typeof TYPE_CONFIG] && (
                <>
                  {React.createElement(TYPE_CONFIG[selectedFeedback.type as keyof typeof TYPE_CONFIG].icon, {
                    className: cn("h-5 w-5", TYPE_CONFIG[selectedFeedback.type as keyof typeof TYPE_CONFIG].color)
                  })}
                </>
              )}
              {selectedFeedback?.title || (locale === "zh" ? "无标题" : "No title")}
            </DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              {/* Submitter Info */}
              {selectedFeedback.expand?.user && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{selectedFeedback.expand.user.name || selectedFeedback.expand.user.email}</span>
                  {selectedFeedback.created && (
                    <>
                      <span>•</span>
                      <span>{format(new Date(selectedFeedback.created), "PPP", { locale: dateLocale })}</span>
                    </>
                  )}
                </div>
              )}

              <Separator />

              {/* Description */}
              <div>
                <h4 className="font-medium mb-2">{locale === "zh" ? "详细描述" : "Description"}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedFeedback.description}</p>
              </div>

              {/* Screenshots */}
              {selectedFeedback.screenshots && selectedFeedback.screenshots.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      {locale === "zh" ? "截图" : "Screenshots"} ({selectedFeedback.screenshots.length})
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedFeedback.screenshots.map((path, index) => (
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

              <Separator />

              {/* Status Update */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {locale === "zh" ? "处理反馈" : "Process Feedback"}
                </h4>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">{locale === "zh" ? "状态" : "Status"}</label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as FeedbackStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {locale === "zh" ? STATUS_CONFIG[status].label : STATUS_CONFIG[status].labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{locale === "zh" ? "回复（可选）" : "Response (optional)"}</label>
                  <Textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder={locale === "zh" ? "输入回复内容..." : "Enter response..."}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              {locale === "zh" ? "取消" : "Cancel"}
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating || !newStatus}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {locale === "zh" ? "保存" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  );
}

export default FeedbackManagement;
