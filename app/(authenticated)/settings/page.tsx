'use client';

import { useState, useRef } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2, Upload, CheckCircle, AlertCircle, MessageSquare, Building2, Ruler } from 'lucide-react';
import { BrandingConfigCard } from '@/components/settings/branding-config-card';
import { FeedbackManagement } from '@/components/settings/feedback-management';
import Link from 'next/link';
export default function SettingsPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({ title: t('common.error'), description: t('settings.selectJsonFile'), variant: 'destructive' });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/seed', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('settings.importError'));
      }

      setImportResult({
        success: true,
        message: t('settings.importSuccess', { created: String(result.results.created), updated: String(result.results.updated) }),
      });

      toast({ title: t('common.success') });
    } catch (error: any) {
      setImportResult({
        success: false,
        message: error.message,
      });
      toast({ title: t('settings.importError'), description: error.message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
              <p className="text-muted-foreground mt-1">{t('settings.description')}</p>
            </div>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button variant="outline" onClick={handleImportClick} disabled={isImporting}>
              {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {t('settings.importConfig')}
            </Button>
          </div>
        </div>
      </div>

      {/* 导入结果提示 */}
      {importResult && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            importResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {importResult.success ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <span>{importResult.message}</span>
        </div>
      )}

      {/* Tabs for different settings sections */}
      <Tabs defaultValue="branding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="branding">
            <Settings className="mr-2 h-4 w-4" />
            {t('settings.brandingLabel')}
          </TabsTrigger>
          <TabsTrigger value="bank-accounts">
            <Building2 className="mr-2 h-4 w-4" />
            {locale === 'zh' ? '银行账户' : 'Bank Accounts'}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="feedback">
              <MessageSquare className="mr-2 h-4 w-4" />
              {t('settings.feedbackManagement')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="branding">
          <BrandingConfigCard />
        </TabsContent>

        <TabsContent value="bank-accounts">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">{locale === 'zh' ? '银行账户管理' : 'Bank Account Management'}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {locale === 'zh' ? '配置公司银行账户，在订单中快速引用' : 'Configure company bank accounts for quick reference in orders'}
                </p>
              </div>
              <Link href="/settings/bank-accounts">
                <Button>
                  <Building2 className="mr-2 h-4 w-4" />
                  {locale === 'zh' ? '管理银行账户' : 'Manage Accounts'}
                </Button>
              </Link>
            </div>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="feedback">
            <FeedbackManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
