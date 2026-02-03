"use client"

/**
 * Advance Status Dialog
 * 订单状态推进对话框
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowRight, 
  Loader2,
  Info,
} from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { getPocketBase } from "@/lib/pocketbase/auth"
import type { OrderStatus, PrerequisiteResult } from "@/lib/order-workflow/types"
import { getNextStatus, getStatusLabelKey } from "@/lib/order-workflow/status-workflow"
import { checkPrerequisites, advanceStatus } from "@/lib/order-workflow/prerequisite-checker"

interface AdvanceStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  orderCode: string
  currentStatus: OrderStatus
  onSuccess: () => void
}

export function AdvanceStatusDialog({
  open,
  onOpenChange,
  orderId,
  orderCode,
  currentStatus,
  onSuccess,
}: AdvanceStatusDialogProps) {
  const { t } = useI18n()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<PrerequisiteResult | null>(null)
  const [skipOptional, setSkipOptional] = useState(false)
  const [reason, setReason] = useState("")
  
  const targetStatus = getNextStatus(currentStatus)
  
  // 当对话框打开时，执行前置条件检查
  useEffect(() => {
    if (open && targetStatus) {
      runChecks()
    } else {
      setResult(null)
      setSkipOptional(false)
      setReason("")
    }
  }, [open, orderId, currentStatus, targetStatus])
  
  const runChecks = async () => {
    if (!targetStatus) return
    
    setChecking(true)
    try {
      const checkResult = await checkPrerequisites(orderId, currentStatus, targetStatus)
      setResult(checkResult)
    } catch (err) {
      console.error("Check prerequisites error:", err)
      toast({
        title: t("orders.workflow.checkError"),
        variant: "destructive",
      })
    } finally {
      setChecking(false)
    }
  }
  
  const handleConfirm = async () => {
    if (!targetStatus || !result) return
    
    setLoading(true)
    try {
      const pb = getPocketBase()
      const userId = pb.authStore.record?.id || "system"
      
      await advanceStatus(orderId, targetStatus, userId, reason || undefined)
      
      toast({
        title: t("orders.workflow.advanceSuccess"),
        description: t("orders.workflow.advanceSuccessDesc", { 
          status: t(getStatusLabelKey(targetStatus)) 
        }),
      })
      
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error("Advance status error:", err)
      toast({
        title: t("orders.workflow.advanceError"),
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  // 计算是否可以确认
  const canConfirm = result?.canAdvance || (skipOptional && result?.checks.every(c => c.passed || !c.required))
  
  // 获取失败的必须检查
  const failedRequired = result?.checks.filter(c => c.required && !c.passed) || []
  // 获取失败的可选检查
  const failedOptional = result?.checks.filter(c => !c.required && !c.passed) || []
  
  if (!targetStatus) {
    return null
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            {t("orders.workflow.advanceTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("orders.workflow.advanceDescription", { code: orderCode })}
          </DialogDescription>
        </DialogHeader>
        
        {/* 状态转换显示 */}
        <div className="flex items-center justify-center gap-4 py-4">
          <Badge variant="outline" className="text-base px-4 py-2">
            {t(getStatusLabelKey(currentStatus))}
          </Badge>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <Badge variant="default" className="text-base px-4 py-2">
            {t(getStatusLabelKey(targetStatus))}
          </Badge>
        </div>
        
        {/* 前置条件检查 */}
        <div className="space-y-4">
          <Label>{t("orders.workflow.prerequisites")}</Label>
          
          {checking ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">
                {t("orders.workflow.checking")}
              </span>
            </div>
          ) : result ? (
            <div className="space-y-2">
              {result.checks.map((check) => (
                <div
                  key={check.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    check.passed 
                      ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
                      : check.required
                        ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                        : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
                  }`}
                >
                  {check.passed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : check.required ? (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {t(check.name)}
                      </span>
                      {!check.required && (
                        <Badge variant="outline" className="text-xs">
                          {t("orders.workflow.optional")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t(check.description)}
                    </p>
                    {!check.passed && check.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">
                        {t(check.errorMessage)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* 跳过可选检查选项 */}
              {failedOptional.length > 0 && failedRequired.length === 0 && (
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="skip-optional"
                    checked={skipOptional}
                    onCheckedChange={(checked) => setSkipOptional(checked === true)}
                  />
                  <Label htmlFor="skip-optional" className="text-sm cursor-pointer">
                    {t("orders.workflow.skipOptional")}
                  </Label>
                </div>
              )}
              
              {/* 必须条件未通过提示 */}
              {failedRequired.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <Info className="h-4 w-4 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-600">
                    {t("orders.workflow.cannotAdvance")}
                  </p>
                </div>
              )}
            </div>
          ) : null}
          
          {/* 备注输入 */}
          <div className="space-y-2">
            <Label htmlFor="reason">{t("orders.workflow.reason")}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("orders.workflow.reasonPlaceholder")}
              rows={2}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!canConfirm || loading || checking}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("orders.workflow.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
