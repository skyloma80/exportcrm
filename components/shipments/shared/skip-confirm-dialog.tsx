'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { WizardStep } from '@/lib/shipment/wizard-config';
import { useI18n } from '@/lib/i18n/use-i18n';

interface SkipConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: WizardStep;
  onConfirm: () => void;
}

export function SkipConfirmDialog({
  open,
  onOpenChange,
  step,
  onConfirm,
}: SkipConfirmDialogProps) {
  const { t } = useI18n();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t('shipments.wizard.skipConfirm.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('shipments.wizard.skipConfirm.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('shipments.wizard.skipConfirm.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t('shipments.wizard.skipConfirm.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
