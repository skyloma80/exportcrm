"use client"

/**
 * Item 表单组件
 * 
 * 可复用的表单组件，用于新建和编辑 Item
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import type { Item } from "@/lib/pocketbase/services/items"
import { 
  validateItemForm, 
  hasValidationErrors,
  type ItemFormData,
  type ValidationErrors 
} from "@/lib/items/validation"
import { useI18n } from "@/lib/i18n/use-i18n"

export type { ItemFormData, ValidationErrors }
export { validateItemForm, hasValidationErrors }

export interface ItemFormProps {
  initialData?: Partial<Item>
  onSubmit: (data: ItemFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  title?: string
}

export function ItemForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  title
}: ItemFormProps) {
  const { t } = useI18n()
  const [formData, setFormData] = useState<ItemFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    status: initialData?.status || "pending",
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field: keyof ItemFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate
    const validationErrors = validateItemForm(formData)
    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors)
      return
    }
    
    setSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error("Form submission error:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const loading = isLoading || submitting

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || t("items.title")}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {t("items.columns.name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              disabled={loading}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("items.columns.description")}</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              disabled={loading}
              rows={4}
              className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.description ? "border-destructive" : ""}`}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/500
            </p>
          </div>

          {/* Status Field */}
          <div className="space-y-2">
            <Label htmlFor="status">{t("items.columns.status")}</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value as ItemFormData['status'])}
              disabled={loading}
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.status ? "border-destructive" : ""}`}
            >
              <option value="pending">{t("items.status.pending")}</option>
              <option value="active">{t("items.status.active")}</option>
              <option value="inactive">{t("items.status.inactive")}</option>
            </select>
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData?.id ? t("common.save") : t("items.newItem")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
