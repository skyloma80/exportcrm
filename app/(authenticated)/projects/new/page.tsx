"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/use-i18n"
import { ArrowLeft } from "lucide-react"
import { ProjectForm } from "@/components/projects/project-form"
import { projectService, ProjectCreateInput } from "@/lib/pocketbase/services/projects"
import { useToast } from "@/hooks/use-toast"

export default function NewProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const customerIdFromUrl = searchParams.get("customer")

  const handleSubmit = async (data: ProjectCreateInput) => {
    setIsLoading(true)
    try {
      const project = await projectService.createProject(data)
      toast({ title: t("projects.createSuccess"), description: t("projects.createSuccessDesc") })
      // Navigate to project detail page with products tab active (Requirements 6.2)
      router.push(`/projects/${project.id}?tab=products`)
    } catch (error: any) {
      console.error("Create project error:", error)
      toast({ title: t("projects.createError"), description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("projects.newProject")}</h1>
            <p className="text-muted-foreground mt-1">{t("projects.newDescription")}</p>
          </div>
        </div>
      </div>
      <div className="max-w-3xl">
        <ProjectForm 
          initialData={customerIdFromUrl ? { customer: customerIdFromUrl } : undefined}
          onSubmit={handleSubmit} 
          onCancel={() => router.back()} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  )
}
