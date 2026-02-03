"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/use-i18n"
import { ArrowLeft } from "lucide-react"
import { ProjectForm } from "@/components/projects/project-form"
import { projectService, Project, ProjectCreateInput } from "@/lib/pocketbase/services/projects"
import { useToast } from "@/hooks/use-toast"

export default function EditProjectPage() {
  const router = useRouter()
  const params = useParams()
  const { t } = useI18n()
  const { toast } = useToast()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => { loadProject() }, [id])

  const loadProject = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await projectService.getOne(id)
      setProject(data)
    } catch (err: any) {
      console.error("Load project error:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: ProjectCreateInput) => {
    setIsSubmitting(true)
    try {
      await projectService.updateProject(id, data)
      toast({ title: t("projects.updateSuccess"), description: t("projects.updateSuccessDesc") })
      router.push(`/projects/${id}`)
    } catch (error: any) {
      console.error("Update project error:", error)
      toast({ title: t("projects.updateError"), description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>{t("common.error")}: {error?.message || t("projects.notFound")}</p>
              <Button variant="outline" onClick={() => router.back()} className="mt-4">{t("common.back")}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("projects.edit")}</h1>
            <p className="text-muted-foreground mt-1">{project.name}</p>
          </div>
        </div>
      </div>
      <div className="max-w-3xl">
        <ProjectForm initialData={project} onSubmit={handleSubmit} onCancel={() => router.back()} isLoading={isSubmitting} />
      </div>
    </div>
  )
}
