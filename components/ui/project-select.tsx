"use client"

/**
 * 项目选择组件
 * 
 * 带搜索功能的下拉选择框，支持中英文显示
 */

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, FolderKanban, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useI18n } from "@/lib/i18n/use-i18n"
import { projectService, ProjectWithRelations } from "@/lib/pocketbase/services/projects"

interface ProjectSelectProps {
  value: string
  onChange: (project: ProjectWithRelations | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function ProjectSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
}: ProjectSelectProps) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<ProjectWithRelations[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const data = await projectService.getAllWithCustomer()
      setProjects(data)
    } catch (error) {
      console.error("Error loading projects:", error)
    } finally {
      setLoading(false)
    }
  }

  // 独立请求逻辑：如果传入了 value 但列表中没有，则单独加载该项目
  useEffect(() => {
    const fetchSingleProject = async () => {
      if (value && projects.length > 0 && !projects.find(p => p.id === value)) {
        try {
          console.log("[ProjectSelect] Value not in list, fetching specifically:", value);
          const p = await projectService.getWithRelations(value);
          if (p) {
            setProjects(prev => [...prev, p]);
          }
        } catch (error) {
          console.error("[ProjectSelect] Error fetching single project:", error);
        }
      }
    };
    fetchSingleProject();
  }, [value, projects.length]);

  const getDisplayName = (project: ProjectWithRelations) => {
    if (locale === "zh" && project.name_cn) return project.name_cn
    return project.name
  }

  const getCustomerName = (project: ProjectWithRelations) => {
    const customer = project.expand?.customer
    if (!customer) return ""
    if (locale === "zh" && customer.name_cn) return customer.name_cn
    return customer.name
  }

  const selectedProject = projects.find((p) => p.id === value)
  
  useEffect(() => {
    if (value) {
      console.log("[ProjectSelect] Value prop:", value, "Found project:", selectedProject?.name || "none");
    }
  }, [value, projects.length])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          {selectedProject ? (
            <span className="flex items-center gap-2 truncate">
              <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
              {getDisplayName(selectedProject)}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {placeholder || t("projects.placeholders.select") || "Select a project..."}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("common.search") || "Search..."} />
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <CommandEmpty>{t("common.noData")}</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`${project.name} ${project.name_cn || ""} ${project.code}`}
                    onSelect={() => {
                      onChange(project.id === value ? null : project)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === project.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{getDisplayName(project)}</span>
                        <span className="text-xs text-muted-foreground font-mono">{project.code}</span>
                      </div>
                      {getCustomerName(project) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {getCustomerName(project)}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
