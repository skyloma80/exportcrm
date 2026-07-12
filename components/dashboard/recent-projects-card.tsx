"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FolderKanban, ArrowRight, User, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useRouter } from "next/navigation"
import { projectService, ProjectWithRelations, ProjectStage } from "@/lib/pocketbase/services/projects"
import { getPocketBase } from "@/lib/pocketbase/auth"

interface RecentProjectsCardProps {
  className?: string;
}

const MAIN_STAGES: ProjectStage[] = ['lead', 'inquiry', 'quotation', 'negotiation', 'won'];

// 阶段优先级（数字越大优先级越高，won 不参与自动推断）
const STAGE_PRIORITY: Record<ProjectStage, number> = {
  lead: 0,
  inquiry: 1,
  quotation: 2,
  negotiation: 3,
  won: 4,  // won 只能手动设置
  lost: -1,
  on_hold: -1,
};

const STAGE_LABELS: Record<ProjectStage, { zh: string; en: string }> = {
  lead: { zh: '线索', en: 'Lead' },
  inquiry: { zh: '询价', en: 'Inquiry' },
  quotation: { zh: '报价', en: 'Quote' },
  negotiation: { zh: '谈判', en: 'Nego' },
  won: { zh: '成交', en: 'Won' },
  lost: { zh: '失败', en: 'Lost' },
  on_hold: { zh: '暂停', en: 'Hold' },
};

const STAGE_COLORS: Record<ProjectStage, string> = {
  lead: 'bg-slate-400',
  inquiry: 'bg-blue-400',
  quotation: 'bg-blue-500',
  negotiation: 'bg-blue-600',
  won: 'bg-blue-700',
  lost: 'bg-red-500',
  on_hold: 'bg-slate-500',
};

// 根据关联数据推断阶段（不包括 won，won 只能手动设置）
// 所有草稿状态的记录都不计入阶段推断
async function inferStageFromRelations(projectId: string): Promise<ProjectStage> {
  const pb = getPocketBase();
  
  try {
    // 检查是否有非草稿订单（negotiation 阶段）
    // 草稿订单不应该影响项目阶段
    const orders = await pb.collection('so').getList(1, 1, {
      filter: `project = "${projectId}" && status != "draft"`,
    });
    if (orders.totalItems > 0) {
      return 'negotiation';
    }

    // 检查是否有非草稿报价单（quotation 阶段）
    const quotations = await pb.collection('quotations').getList(1, 1, {
      filter: `project = "${projectId}" && status != "draft"`,
    });
    if (quotations.totalItems > 0) {
      return 'quotation';
    }

  } catch (error) {
    console.error('Failed to infer stage from relations:', error);
  }

  return 'lead';
}

export function RecentProjectsCard({ className }: RecentProjectsCardProps) {
  const { locale } = useI18n();
  const isZh = locale === 'zh';
  const router = useRouter();
  
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const result = await projectService.getList({
          page: 1,
          perPage: 1,
          sort: '-id',
          expand: 'customer',
        });
        const proj = result.items[0] as ProjectWithRelations || null;
        
        if (proj) {
          // 推断阶段并检查是否需要更新
          const inferredStage = await inferStageFromRelations(proj.id);
          const currentPriority = STAGE_PRIORITY[proj.stage] ?? -1;
          const inferredPriority = STAGE_PRIORITY[inferredStage] ?? -1;
          
          // 如果推断的阶段优先级更高，且当前不是 won/lost/on_hold，则更新数据库
          if (inferredPriority > currentPriority && currentPriority >= 0 && proj.stage !== 'won') {
            try {
              await projectService.update(proj.id, { stage: inferredStage });
              proj.stage = inferredStage; // 更新本地状态
            } catch (error) {
              console.error('Failed to update project stage:', error);
            }
          }
        }
        
        setProject(proj);
      } catch (error) {
        console.error('Failed to fetch recent project:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return isZh ? '今天' : 'Today';
    if (diffDays === 1) return isZh ? '昨天' : 'Yesterday';
    if (diffDays < 7) return isZh ? `${diffDays}天前` : `${diffDays}d ago`;
    return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const formatExpectedDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStageIndex = (stage: ProjectStage) => MAIN_STAGES.indexOf(stage);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!project) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            {isZh ? '最新项目' : 'Latest Project'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {isZh ? '暂无项目' : 'No projects yet'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // 直接使用数据库中的 stage 字段
  const currentStage = project.stage;
  const currentIndex = getStageIndex(currentStage);

  return (
    <Card 
      className={cn("cursor-pointer hover:border-primary transition-all", className)}
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            {isZh ? '最新项目' : 'Latest Project'}
          </CardTitle>
          <button
            onClick={(e) => { e.stopPropagation(); router.push('/projects'); }}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            {isZh ? '全部' : 'View all'}
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 项目编号 */}
        <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">{project.code}</p>

        {/* 项目名称 */}
        <div>
          <p className="font-semibold text-sm text-foreground">
            {isZh && project.name_cn ? project.name_cn : project.name}
          </p>
          {project.name_cn && project.name && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {isZh ? project.name : project.name_cn}
            </p>
          )}
        </div>
        
        {/* 客户 + 创建时间 */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <User className="h-3 w-3 text-blue-500" />
            <span className="text-foreground">{isZh ? '客户' : 'Customer'}: <span className="font-medium">{project.expand?.customer?.name || '-'}</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-3 w-3 text-blue-500" />
            <span className="text-foreground">{isZh ? '创建' : 'Created'}: <span className="font-medium">{formatDate(project.created)}</span></span>
          </div>
        </div>

        {/* 项目进度 */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-muted-foreground">{isZh ? '项目进度' : 'Progress'}</p>
          <div className="relative flex items-center justify-between">
            {/* 背景线 */}
            <div className="absolute left-1.5 right-1.5 top-1/2 -translate-y-1/2 h-0.5 bg-muted-foreground/30" />
            {/* 进度线 */}
            {currentIndex > 0 && (
              <div 
                className={cn("absolute left-1.5 top-1/2 -translate-y-1/2 h-0.5", STAGE_COLORS[currentStage])}
                style={{ width: `${(currentIndex / (MAIN_STAGES.length - 1)) * 100}%` }}
              />
            )}
            {/* 节点 */}
            {MAIN_STAGES.map((stage, idx) => {
              const isActive = idx <= currentIndex && currentIndex >= 0;
              const isCurrent = idx === currentIndex;
              return (
                <div 
                  key={stage} 
                  className={cn(
                    "relative z-10 w-3 h-3 rounded-full border-2 transition-colors",
                    isActive ? `${STAGE_COLORS[currentStage]} border-transparent` : "bg-background border-muted-foreground/30",
                    isCurrent && "ring-2 ring-offset-1 ring-offset-background ring-primary/50"
                  )} 
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            {MAIN_STAGES.map((stage) => (
              <span key={stage}>{isZh ? STAGE_LABELS[stage].zh : STAGE_LABELS[stage].en}</span>
            ))}
          </div>
        </div>

        {/* 预计成交日期 */}
        {project.expected_close_date && (
          <div className="text-xs text-muted-foreground">
            {isZh ? '预计成交' : 'Expected Close'}: {formatExpectedDate(project.expected_close_date)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentProjectsCard;
