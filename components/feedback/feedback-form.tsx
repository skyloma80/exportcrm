"use client";

import React, { useState, useMemo } from "react";
import { Bug, Lightbulb, TrendingUp, HelpCircle, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/use-i18n";
import { ScreenshotUploader, UploadedFile } from "./screenshot-uploader";
import { FeedbackType } from "@/lib/pocketbase/services/feedbacks";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface FeedbackFormData {
  type: FeedbackType;
  title: string;
  description: string;
  screenshots: string[];
}

export interface FeedbackFormProps {
  onSubmit: (data: FeedbackFormData) => Promise<void>;
  isLoading?: boolean;
}

export interface ValidationErrors {
  title?: string;
  description?: string;
}

// ============================================================================
// Validation
// ============================================================================

export function validateFeedbackForm(data: {
  title: string;
  description: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  // 标题可选，但如果填写了不能超过200字符
  if (data.title.length > 200) {
    errors.title = "标题不能超过200字符";
  }

  if (!data.description.trim()) {
    errors.description = "描述不能为空";
  } else if (data.description.length > 5000) {
    errors.description = "描述不能超过5000字符";
  }

  return errors;
}

export function hasValidationErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ============================================================================
// Constants
// ============================================================================

const FEEDBACK_TYPES = [
  { value: "bug" as const, label: "Bug 报告", labelEn: "Bug Report", icon: Bug, color: "text-red-500" },
  { value: "feature" as const, label: "功能建议", labelEn: "Feature Request", icon: Lightbulb, color: "text-yellow-500" },
  { value: "improvement" as const, label: "改进意见", labelEn: "Improvement", icon: TrendingUp, color: "text-blue-500" },
  { value: "other" as const, label: "其他", labelEn: "Other", icon: HelpCircle, color: "text-gray-500" },
];

// ============================================================================
// Component
// ============================================================================

export function FeedbackForm({ onSubmit, isLoading = false }: FeedbackFormProps) {
  const { t, locale } = useI18n();
  const [type, setType] = useState<FeedbackType>("feature");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Generate a unique ID for this feedback session (for S3 folder)
  const feedbackId = useMemo(() => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateFeedbackForm({ title, description });
    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    await onSubmit({
      type,
      title: title.trim(),
      description: description.trim(),
      screenshots: screenshots.map((s) => s.path),
    });

    // Reset form on success
    setTitle("");
    setDescription("");
    setScreenshots([]);
    setType("feature");
  };

  const selectedType = FEEDBACK_TYPES.find((t) => t.value === type);

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              {locale === "zh" ? "提交反馈" : "Submit Feedback"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Feedback Type Selection */}
            <div className="space-y-2">
              <Label>{locale === "zh" ? "反馈类型" : "Feedback Type"}</Label>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_TYPES.map((feedbackType) => {
                  const Icon = feedbackType.icon;
                  const isSelected = type === feedbackType.value;
                  return (
                    <button
                      key={feedbackType.value}
                      type="button"
                      onClick={() => setType(feedbackType.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Icon className={cn("h-6 w-6", feedbackType.color)} />
                      <span className="text-sm font-medium">
                        {locale === "zh" ? feedbackType.label : feedbackType.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {locale === "zh" ? "标题" : "Title"}
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) {
                    setErrors((prev) => ({ ...prev, title: undefined }));
                  }
                }}
                placeholder={locale === "zh" ? "简要描述您的反馈（可选）" : "Brief description of your feedback (optional)"}
                maxLength={200}
                disabled={isLoading}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
              <p className="text-xs text-muted-foreground text-right">
                {title.length} / 200
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                {locale === "zh" ? "详细描述" : "Description"} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) {
                    setErrors((prev) => ({ ...prev, description: undefined }));
                  }
                }}
                placeholder={
                  locale === "zh"
                    ? "请详细描述您遇到的问题或建议..."
                    : "Please describe your issue or suggestion in detail..."
                }
                rows={4}
                maxLength={5000}
                disabled={isLoading}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
              <p className="text-xs text-muted-foreground text-right">
                {description.length} / 5000
              </p>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>{locale === "zh" ? "提交中..." : "Submitting..."}</>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {locale === "zh" ? "提交反馈" : "Submit Feedback"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column - Screenshots */}
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "zh" ? "截图（可选）" : "Screenshots (Optional)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScreenshotUploader
              feedbackId={feedbackId}
              value={screenshots}
              onChange={setScreenshots}
              maxFiles={5}
              maxSizeMB={5}
              disabled={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

export default FeedbackForm;
