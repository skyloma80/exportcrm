"use client"

/**
 * Customer Contact Form Dialog
 * 客户联系人表单对话框
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Loader2 } from "lucide-react"
import { CustomerContact } from "@/lib/pocketbase/services/customers"

interface ContactFormData {
  name: string
  position: string
  email: string
  phone: string
  wechat: string
  is_primary: boolean
}

interface ValidationErrors {
  name?: string
  email?: string
}

export interface ContactFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<CustomerContact>
  onSubmit: (data: ContactFormData) => Promise<void>
  isLoading?: boolean
}

export function ContactFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isLoading,
}: ContactFormDialogProps) {
  const { t } = useI18n()
  
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    position: "",
    email: "",
    phone: "",
    wechat: "",
    is_primary: false,
  })
  
  const [errors, setErrors] = useState<ValidationErrors>({})

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      setFormData({
        name: initialData?.name || "",
        position: initialData?.position || "",
        email: initialData?.email || "",
        phone: initialData?.phone || "",
        wechat: initialData?.wechat || "",
        is_primary: initialData?.is_primary || false,
      })
      setErrors({})
    }
  }, [open, initialData])

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = t("validation.required")
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t("validation.invalidEmail")
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(formData)
  }

  const handleChange = (field: keyof ContactFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const isEditing = !!initialData?.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("customers.contacts.edit") : t("customers.contacts.add")}
          </DialogTitle>
          <DialogDescription>
            {t("customers.contacts.description")}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t("customers.contacts.name")} *
              </Label>
              <div className="col-span-3">
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder={t("customers.contacts.namePlaceholder")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name}</p>
                )}
              </div>
            </div>

            {/* Position */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">
                {t("customers.contacts.position")}
              </Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => handleChange("position", e.target.value)}
                placeholder={t("customers.contacts.positionPlaceholder")}
                className="col-span-3"
              />
            </div>

            {/* Email */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                {t("customers.contacts.email")}
              </Label>
              <div className="col-span-3">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder={t("customers.contacts.emailPlaceholder")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                {t("customers.contacts.phone")}
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder={t("customers.contacts.phonePlaceholder")}
                className="col-span-3"
              />
            </div>

            {/* WeChat */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wechat" className="text-right">
                {t("customers.contacts.wechat")}
              </Label>
              <Input
                id="wechat"
                value={formData.wechat}
                onChange={(e) => handleChange("wechat", e.target.value)}
                placeholder={t("customers.contacts.wechatPlaceholder")}
                className="col-span-3"
              />
            </div>

            {/* Is Primary */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                {t("customers.contacts.primary")}
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Checkbox
                  id="is_primary"
                  checked={formData.is_primary}
                  onCheckedChange={(checked) => handleChange("is_primary", checked)}
                />
                <Label htmlFor="is_primary" className="text-sm font-normal">
                  {t("customers.contacts.setPrimary")}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
