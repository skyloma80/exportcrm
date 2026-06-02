"use client"

/**
 * Customer Form Component
 * 客户表单组件
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/lib/i18n/use-i18n"
import { CountrySelect } from "@/components/ui/country-select"
import { Customer, CustomerCreateInput } from "@/lib/pocketbase/services/customers"
import { Loader2 } from "lucide-react"

interface ValidationErrors {
  name?: string
  country?: string
  type?: string
}

export interface CustomerFormProps {
  initialData?: Partial<Customer>
  onSubmit: (data: CustomerCreateInput) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function CustomerForm({ initialData, onSubmit, onCancel, isLoading }: CustomerFormProps) {
  const { t } = useI18n()
  
  const [formData, setFormData] = useState<CustomerCreateInput>({
    name: initialData?.name || "",
    name_cn: initialData?.name_cn || "",
    country: initialData?.country || "",
    type: initialData?.type || "direct",
    rating: initialData?.rating,
    preferred_currency: initialData?.preferred_currency || "",
    address: initialData?.address || "",
    address_cn: initialData?.address_cn || "",
    website: initialData?.website || "",
    remarks: initialData?.remarks || "",
    tax_id: initialData?.tax_id || "",
    supplier_id: initialData?.supplier_id || "",
  })
  
  const [errors, setErrors] = useState<ValidationErrors>({})

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = t("validation.required")
    }
    if (!formData.country) {
      newErrors.country = t("validation.required")
    }
    if (!formData.type) {
      newErrors.type = t("validation.required")
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(formData)
  }

  const handleChange = (field: keyof CustomerCreateInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("customers.form.name")} <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder={t("customers.placeholders.name")}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name_cn">{t("customers.form.nameCn")}</Label>
              <Input
                id="name_cn"
                value={formData.name_cn}
                onChange={(e) => handleChange("name_cn", e.target.value)}
                placeholder={t("customers.placeholders.nameCn")}
              />
            </div>
          </div>

          {/* Country, Type, Rating */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("customers.form.country")} <span className="text-destructive">*</span></Label>
              <CountrySelect
                value={formData.country}
                onChange={(value) => handleChange("country", value)}
              />
              {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>{t("customers.form.type")} <span className="text-destructive">*</span></Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("customers.placeholders.type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">{t("customers.type.direct")}</SelectItem>
                  <SelectItem value="agent">{t("customers.type.agent")}</SelectItem>
                  <SelectItem value="distributor">{t("customers.type.distributor")}</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>{t("customers.form.rating")}</Label>
              <Select
                value={formData.rating?.toString() || "_none_"}
                onValueChange={(value) => handleChange("rating", value === "_none_" ? undefined : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("customers.placeholders.rating")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">-</SelectItem>
                  <SelectItem value="5">⭐⭐⭐⭐⭐</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐</SelectItem>
                  <SelectItem value="3">⭐⭐⭐</SelectItem>
                  <SelectItem value="2">⭐⭐</SelectItem>
                  <SelectItem value="1">⭐</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Currency and Website */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("customers.form.currency")}</Label>
              <Select
                value={formData.preferred_currency || "_none_"}
                onValueChange={(value) => handleChange("preferred_currency", value === "_none_" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("customers.placeholders.currency")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">-</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                  <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                  <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">{t("customers.form.website")}</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder={t("customers.placeholders.website")}
              />
            </div>
          </div>

          {/* Tax ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax_id">{t("customers.form.taxId")}</Label>
              <Input
                id="tax_id"
                value={formData.tax_id}
                onChange={(e) => handleChange("tax_id", e.target.value)}
                placeholder={t("customers.placeholders.taxId")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier_id">{t("customers.form.supplierId")}</Label>
              <Input
                id="supplier_id"
                value={formData.supplier_id}
                onChange={(e) => handleChange("supplier_id", e.target.value)}
                placeholder={t("customers.placeholders.supplierId")}
              />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">{t("customers.form.address")}</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder={t("customers.placeholders.address")}
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address_cn">{t("customers.form.addressCn")}</Label>
              <Textarea
                id="address_cn"
                value={formData.address_cn}
                onChange={(e) => handleChange("address_cn", e.target.value)}
                placeholder={t("customers.placeholders.addressCn")}
                rows={2}
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">{t("customers.form.remarks")}</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
              placeholder={t("customers.placeholders.remarks")}
              rows={3}
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
