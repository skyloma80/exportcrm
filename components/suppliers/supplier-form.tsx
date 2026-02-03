"use client"

/**
 * Supplier Form Component
 * 供应商表单组件
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
import { Supplier, SupplierCreateInput } from "@/lib/pocketbase/services/suppliers"
import { Loader2 } from "lucide-react"

interface ValidationErrors {
  name?: string
  country?: string
  type?: string
}

export interface SupplierFormProps {
  initialData?: Partial<Supplier>
  onSubmit: (data: SupplierCreateInput) => Promise<void>
  isLoading?: boolean
}

export function SupplierForm({ initialData, onSubmit, isLoading }: SupplierFormProps) {
  const { t } = useI18n()
  
  const [formData, setFormData] = useState<SupplierCreateInput>({
    name: initialData?.name || "",
    name_cn: initialData?.name_cn || "",
    country: initialData?.country || "",
    type: initialData?.type || "manufacturer",
    rating: initialData?.rating,
    address: initialData?.address || "",
    address_cn: initialData?.address_cn || "",
    capabilities: initialData?.capabilities || [],
    certifications: initialData?.certifications || [],
    remarks: initialData?.remarks || "",
  })
  
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [capabilitiesInput, setCapabilitiesInput] = useState(
    (initialData?.capabilities || []).join(", ")
  )
  const [certificationsInput, setCertificationsInput] = useState(
    (initialData?.certifications || []).join(", ")
  )


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
    
    // Parse comma-separated values
    const capabilities = capabilitiesInput
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
    const certifications = certificationsInput
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
    
    await onSubmit({
      ...formData,
      capabilities,
      certifications,
    })
  }

  const handleChange = (field: keyof SupplierCreateInput, value: any) => {
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
              <Label htmlFor="name">{t("suppliers.columns.name")} <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder={t("suppliers.placeholders.name")}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name_cn">{t("suppliers.columns.nameCn")}</Label>
              <Input
                id="name_cn"
                value={formData.name_cn}
                onChange={(e) => handleChange("name_cn", e.target.value)}
                placeholder={t("suppliers.placeholders.nameCn")}
              />
            </div>
          </div>


          {/* Country, Type, Rating */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("suppliers.columns.country")} <span className="text-destructive">*</span></Label>
              <CountrySelect
                value={formData.country}
                onChange={(value) => handleChange("country", value)}
              />
              {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>{t("suppliers.columns.type")} <span className="text-destructive">*</span></Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("suppliers.placeholders.type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manufacturer">{t("suppliers.type.manufacturer")}</SelectItem>
                  <SelectItem value="trader">{t("suppliers.type.trader")}</SelectItem>
                  <SelectItem value="agent">{t("suppliers.type.agent")}</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>{t("suppliers.columns.rating")}</Label>
              <Select
                value={formData.rating?.toString() || "_none_"}
                onValueChange={(value) => handleChange("rating", value === "_none_" ? undefined : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("suppliers.placeholders.rating")} />
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

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">{t("suppliers.columns.address")}</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder={t("suppliers.placeholders.address")}
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address_cn">{t("suppliers.columns.addressCn")}</Label>
              <Textarea
                id="address_cn"
                value={formData.address_cn}
                onChange={(e) => handleChange("address_cn", e.target.value)}
                placeholder={t("suppliers.placeholders.addressCn")}
                rows={2}
              />
            </div>
          </div>


          {/* Capabilities & Certifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capabilities">{t("suppliers.info.capabilities")}</Label>
              <Input
                id="capabilities"
                value={capabilitiesInput}
                onChange={(e) => setCapabilitiesInput(e.target.value)}
                placeholder={t("suppliers.placeholders.capabilities")}
              />
              <p className="text-xs text-muted-foreground">{t("suppliers.hints.commaSeparated")}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="certifications">{t("suppliers.info.certifications")}</Label>
              <Input
                id="certifications"
                value={certificationsInput}
                onChange={(e) => setCertificationsInput(e.target.value)}
                placeholder={t("suppliers.placeholders.certifications")}
              />
              <p className="text-xs text-muted-foreground">{t("suppliers.hints.commaSeparated")}</p>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">{t("suppliers.info.remarks")}</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
              placeholder={t("suppliers.placeholders.remarks")}
              rows={3}
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
