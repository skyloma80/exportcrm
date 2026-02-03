"use client"

/**
 * Project Select Dialog for RFQ
 * 项目选择对话框
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Search, FolderKanban, Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { projectService, Project, ProjectWithRelations } from "@/lib/pocketbase/services/projects"

interface ProjectSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (project: ProjectWithRelations) => void
  selectedProjectId?: string
}

export function ProjectSelectDialog({
  open,
  onOpenChange,
  onSelect,
  selectedProjectId,
}: ProjectSelectDialogProps) {
  const { t, locale } = useI18n()
  const [projects, setProjects] = useState<ProjectWithRelations[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadProjects()
      setSearchTerm("")
    }
  }, [open])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const data = await projectService.getAllWithCustomer()
      setProjects(data)
    } catch (error) {
      console.error("Error loading projects:", error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter((project) => {
    const searchLower = searchTerm.toLowerCase()
    const customerName = project.expand?.customer?.name || ""
    const customerNameCn = project.expand?.customer?.name_cn || ""
    
    return (
      project.name.toLowerCase().includes(searchLower) ||
      (project.name_cn && project.name_cn.toLowerCase().includes(searchLower)) ||
      project.code.toLowerCase().includes(searchLower) ||
      customerName.toLowerCase().includes(searchLower) ||
      customerNameCn.toLowerCase().includes(searchLower)
    )
  })

  const handleSelect = (project: ProjectWithRelations) => {
    onSelect(project)
    onOpenChange(false)
  }

  const getDisplayName = (project: Project) => {
    if (locale === "zh" && project.name_cn) return project.name_cn
    return project.name
  }

  const getCustomerDisplayName = (project: ProjectWithRelations) => {
    const customer = project.expand?.customer
    if (!customer) return "-"
    if (locale === "zh" && customer.name_cn) return customer.name_cn
    return customer.name
  }

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      lead: "bg-gray-100 text-gray-800",
      inquiry: "bg-blue-100 text-blue-800",
      quotation: "bg-yellow-100 text-yellow-800",
      negotiation: "bg-orange-100 text-orange-800",
      won: "bg-green-100 text-green-800",
      lost: "bg-red-100 text-red-800",
      on_hold: "bg-purple-100 text-purple-800",
    }
    return colors[stage] || "bg-gray-100 text-gray-800"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            {t("rfqs.placeholders.project")}
          </DialogTitle>
          <DialogDescription>
            {t("projects.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search") || "Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium mb-1">
                  {searchTerm ? t("common.noData") : t("projects.rfqs.empty")}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredProjects.map((project) => {
                  const isSelected = project.id === selectedProjectId

                  return (
                    <div
                      key={project.id}
                      className={`p-4 hover:bg-muted cursor-pointer transition-colors ${
                        isSelected ? "bg-muted" : ""
                      }`}
                      onClick={() => handleSelect(project)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{getDisplayName(project)}</h4>
                            <Badge variant="outline" className={getStageColor(project.stage)}>
                              {t(`projects.stages.${project.stage}`)}
                            </Badge>
                            {isSelected && (
                              <Badge variant="default" className="text-xs">
                                {t("common.selected") || "Selected"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{project.code}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("projects.columns.customer")}: {getCustomerDisplayName(project)}
                          </p>
                        </div>
                        <FolderKanban className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
