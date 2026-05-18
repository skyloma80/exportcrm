'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Loader2, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function MasterDataCard() {
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importResult, setImportResult] = useState<any>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/settings/master-data/export');
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MasterData_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: t('settings.masterData.exportSuccess'),
        description: t('settings.masterData.exportSuccessDesc'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('update_existing', String(updateExisting));

    try {
      const response = await fetch('/api/settings/master-data/import', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Import failed');
      
      setImportResult(result.results);
      toast({
        title: t('settings.masterData.importSuccess'),
        description: t('settings.masterData.importSuccessDesc'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-green-600" />
          <CardTitle>{t('settings.masterData.title')}</CardTitle>
        </div>
        <CardDescription>
          {t('settings.masterData.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-slate-50/50">
            <h3 className="font-medium flex items-center gap-2">
              <Download className="h-4 w-4" />
              {t('common.export')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('settings.masterData.description')}
            </p>
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {t('settings.masterData.exportButton')}
            </Button>
          </div>

          {/* Import Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-slate-50/50">
            <h3 className="font-medium flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {t('common.import')}
            </h3>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="update-existing" 
                checked={updateExisting} 
                onCheckedChange={(checked) => setUpdateExisting(!!checked)}
              />
              <Label htmlFor="update-existing" className="text-sm cursor-pointer">
                {t('settings.masterData.updateExisting')}
              </Label>
            </div>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                id="master-import-input"
                onChange={handleImport}
                disabled={isImporting}
              />
              <Button 
                variant="outline" 
                className="w-full border-dashed"
                disabled={isImporting}
                asChild
              >
                <label htmlFor="master-import-input" className="cursor-pointer">
                  {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {t('settings.masterData.importButton')}
                </label>
              </Button>
            </div>
          </div>
        </div>

        {/* Results display */}
        {importResult && (
          <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-100 text-green-900">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t('settings.masterData.summary')}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {Object.entries(importResult).map(([key, stats]: [string, any]) => (
                <div key={key} className="flex justify-between border-b border-green-200 pb-1">
                  <span className="capitalize">{key.replace('_', ' ')}:</span>
                  <span className="font-mono">
                    {stats.created}↑ {stats.updated}↻ {stats.failed > 0 && <span className="text-red-600">({stats.failed}!)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
