'use client'

/**
 * Status Confirm Dialog - 报价单状态确认对话框
 * 用于确认标记为已接受或已拒绝操作
 */

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/lib/i18n/use-i18n'

interface StatusConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'accept' | 'reject'
  onConfirm: (reason?: string) => void
  loading?: boolean
}

export function StatusConfirmDialog({
  open,
  onOpenChange,
  type,
  onConfirm,
  loading,
}: StatusConfirmDialogProps) {
  const { t } = useI18n()
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    onConfirm(type === 'reject' ? reason : undefined)
    setReason('')
  }

  const handleCancel = () => {
    setReason('')
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {type === 'accept' 
              ? t('quotations.confirmAccept.title')
              : t('quotations.confirmReject.title')
            }
          </AlertDialogTitle>
          <AlertDialogDescription>
            {type === 'accept'
              ? t('quotations.confirmAccept.description')
              : t('quotations.confirmReject.description')
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {type === 'reject' && (
          <div className="space-y-2 py-4">
            <Label htmlFor="rejection-reason">
              {t('quotations.confirmReject.reason')}
            </Label>
            <Textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('quotations.confirmReject.reasonPlaceholder')}
              rows={3}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
            disabled={loading}
            className={type === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {loading ? t('common.loading') : t('common.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
