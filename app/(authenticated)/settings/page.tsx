'use client';

import { useState, useRef } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2, Upload, CheckCircle, AlertCircle, Ruler, CreditCard, FileJson, Download } from 'lucide-react';
import Link from 'next/link';
import { BrandingConfigCard } from '@/components/settings/branding-config-card';

function ApiDocsTab() {
  const { locale } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/openapi/download');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Download failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openapi_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: locale === 'zh' ? '下载成功' : 'Downloaded' });
    } catch (err: any) {
      toast({ title: locale === 'zh' ? '下载失败' : 'Download failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">
            {locale === 'zh' ? 'OpenAPI 接口文档' : 'OpenAPI Documentation'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === 'zh'
              ? '生成并下载完整的 REST API 接口文档（OpenAPI 3.1 格式），可用于导入 Postman、Swagger Editor 等工具'
              : 'Generate and download the complete REST API specification (OpenAPI 3.1) for use with Postman, Swagger Editor, etc.'}
          </p>
        </div>
        <Button onClick={handleDownload} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {locale === 'zh' ? '生成并下载' : 'Generate & Download'}
        </Button>
      </div>
    </div>
  );
}

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
          <TabsTrigger value="remittance">
            <CreditCard className="mr-2 h-4 w-4" />
            {locale === 'zh' ? '汇款模板' : 'Remittance'}
          </TabsTrigger>
          <TabsTrigger value="api">
            <FileJson className="mr-2 h-4 w-4" />
            {locale === 'zh' ? 'API 文档' : 'API Docs'}
          </TabsTrigger>

        </TabsList>

        <TabsContent value="branding">
          <BrandingConfigCard />
        </TabsContent>

        <TabsContent value="remittance">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">{locale === 'zh' ? '汇款模板管理' : 'Remittance Templates'}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {locale === 'zh' ? '配置汇款指令模板，在订单中快速引用' : 'Configure remittance templates for quick reference in orders'}
                </p>
              </div>
              <Link href="/settings/remittance">
                <Button>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {locale === 'zh' ? '管理模板' : 'Manage Templates'}
                </Button>
              </Link>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="api">
          <ApiDocsTab />
        </TabsContent>

      </Tabs>
    </div>
  );
}
