"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CustomerSelect } from "@/components/ui/customer-select"
import { useI18n } from "@/lib/i18n/use-i18n"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { Project, ProjectCreateInput, PROJECT_STAGES, ProjectStage } from "@/lib/pocketbase/services/projects"
import { Customer } from "@/lib/pocketbase/services/customers"
import { Loader2 } from "lucide-react"

interface ValidationErrors {
  name?: string
  customer?: string
  stage?: string
}

export interface ProjectFormProps {
  initialData?: Partial<Project>
  onSubmit: (data: ProjectCreateInput) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function ProjectForm({ initialData, onSubmit, onCancel, isLoading }: ProjectFormProps) {
  const { t, locale } = useI18n()
  const [customers, setCustomers] = useState<Customer[]>([])
  
  const [formData, setFormData] = useState<ProjectCreateInput>({
    name: initialData?.name || "",
    name_cn: initialData?.name_cn || "",
    customer: initialData?.customer || "",
    stage: initialData?.stage || "lead",
    probability: initialData?.probability,
    expected_close_date: initialData?.expected_close_date || "",
    description: initialData?.description || "",
    description_cn: initialData?.description_cn || "",
  })
  
  const [errors, setErrors] = useState<ValidationErrors>({})

  useEffect(() => { loadCustomers() }, [])

  const loadCustomers = async () => {
    try {
      const pb = getPocketBase()
      const result = await pb.collection("customers").getFullList<Customer>({ sort: "name" })
      setCustomers(result)
    } catch (err) {
      console.error("Error loading customers:", err)
    }
  }

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {}
    if (!formData.name.trim()) newErrors.name = t("validation.required")
    if (!formData.customer) newErrors.customer = t("validation.required")
    if (!formData.stage) newErrors.stage = t("validation.required")
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(formData)
  }

  const handleChange = (field: keyof ProjectCreateInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }


  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("projects.columns.name")} *</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder={t("projects.placeholders.name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name_cn">{t("projects.columns.nameCn")}</Label>
              <Input id="name_cn" value={formData.name_cn} onChange={(e) => handleChange("name_cn", e.target.value)} placeholder={t("projects.placeholders.nameCn")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("projects.columns.customer")} *</Label>
              <Select value={formData.customer} onValueChange={(value) => handleChange("customer", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("projects.placeholders.customer")} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {locale === 'zh' && c.name_cn ? c.name_cn : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customer && <p className="text-sm text-destructive">{errors.customer}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t("projects.columns.stage")} *</Label>
              <Select value={formData.stage} onValueChange={(value) => handleChange("stage", value as ProjectStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{t(`projects.stages.${s.value}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.stage && <p className="text-sm text-destructive">{errors.stage}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="probability">{t("projects.columns.probability")}</Label>
              <Input id="probability" type="number" min="0" max="100" value={formData.probability ?? ""} onChange={(e) => handleChange("probability", e.target.value ? parseInt(e.target.value) : undefined)} placeholder="0-100" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_close_date">{t("projects.columns.expectedClose")}</Label>
              <Input id="expected_close_date" type="date" value={formData.expected_close_date?.split('T')[0] || ""} onChange={(e) => handleChange("expected_close_date", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">{t("projects.columns.description")}</Label>
              <Textarea id="description" value={formData.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange("description", e.target.value)} placeholder={t("projects.placeholders.description")} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description_cn">{t("projects.columns.descriptionCn")}</Label>
              <Textarea id="description_cn" value={formData.description_cn} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange("description_cn", e.target.value)} placeholder={t("projects.placeholders.descriptionCn")} rows={3} />
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>{t("common.cancel")}</Button>}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
