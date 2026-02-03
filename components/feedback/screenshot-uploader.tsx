"use client";

import React, { useState, useCallback, useRef } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/use-i18n";

// ============================================================================
// Types
// ============================================================================

export interface UploadedFile {
  path: string;
  name: string;
  url: string;
  size: number;
}

export interface ScreenshotUploaderProps {
  feedbackId: string;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_SIZE_MB = 5;

// ============================================================================
// Validation
// ============================================================================

export function validateFile(
  file: File,
  maxSizeMB: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "仅支持 PNG, JPG, GIF, WebP 格式的图片" };
  }
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `文件大小不能超过 ${maxSizeMB}MB` };
  }
  
  return { valid: true };
}

// ============================================================================
// Component
// ============================================================================

export function ScreenshotUploader({
  feedbackId,
  value,
  onChange,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  disabled = false,
}: ScreenshotUploaderProps) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUploadMore = value.length < maxFiles;

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    const validation = validateFile(file, maxSizeMB);
    if (!validation.valid) {
      setError(validation.error || "文件验证失败");
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", `feedback/${feedbackId}`);

    try {
      const response = await fetch("/api/disk/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "上传失败");
      }

      const data = await response.json();
      return {
        path: data.path,
        name: file.name,
        url: `/api/disk/file?path=${encodeURIComponent(data.path)}`,
        size: file.size,
      };
    } catch (err: any) {
      setError(err.message || "上传失败");
      return null;
    }
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (disabled || isUploading) return;

      const fileArray = Array.from(files);
      const remainingSlots = maxFiles - value.length;

      if (remainingSlots <= 0) {
        setError(`最多只能上传 ${maxFiles} 张截图`);
        return;
      }

      const filesToUpload = fileArray.slice(0, remainingSlots);
      if (fileArray.length > remainingSlots) {
        setError(`最多只能上传 ${maxFiles} 张截图，已选择前 ${remainingSlots} 张`);
      } else {
        setError(null);
      }

      setIsUploading(true);

      const uploadedFiles: UploadedFile[] = [];
      for (const file of filesToUpload) {
        const uploaded = await uploadFile(file);
        if (uploaded) {
          uploadedFiles.push(uploaded);
        }
      }

      if (uploadedFiles.length > 0) {
        onChange([...value, ...uploadedFiles]);
      }

      setIsUploading(false);
    },
    [disabled, isUploading, maxFiles, value, onChange, feedbackId]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [disabled, isUploading, handleFiles]
  );

  const handleClick = () => {
    if (!disabled && !isUploading && canUploadMore) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    const newFiles = [...value];
    newFiles.splice(index, 1);
    onChange(newFiles);
    setError(null);
  };

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging && "border-primary bg-primary/5",
          !canUploadMore && "opacity-50 cursor-not-allowed",
          disabled && "opacity-50 cursor-not-allowed",
          !isDragging && canUploadMore && !disabled && "hover:border-primary/50"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || !canUploadMore}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">上传中...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {canUploadMore
                ? "点击或拖拽图片到此处上传"
                : `已达到最大数量 (${maxFiles} 张)`}
            </p>
            <p className="text-xs text-muted-foreground">
              支持 PNG, JPG, GIF, WebP，单文件最大 {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Thumbnails */}
      {value.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {value.map((file, index) => (
            <div
              key={file.path}
              className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
            >
              <img
                src={file.url}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(index);
                }}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                <p className="text-xs text-white truncate">{file.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Count */}
      <p className="text-xs text-muted-foreground text-right">
        {value.length} / {maxFiles} 张
      </p>
    </div>
  );
}

export default ScreenshotUploader;
