'use client';

/**
 * AI Settings Page
 * AI配置页面
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/use-i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Bot, Save, Loader2, TestTube } from 'lucide-react';
import { getPocketBase } from '@/lib/pocketbase/auth';
import { aiAgentService, type AIProvider } from '@/lib/services/ai-agent-service';

const AI_PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'bedrock', label: 'AWS Bedrock' },
  { value: 'custom', label: 'Custom Endpoint' },
];

export default function AISettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const pb = getPocketBase();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  const [config, setConfig] = useState({
    provider: 'openai' as AIProvider,
    apiKey: '',
    apiEndpoint: '',
    model: '',
    isEnabled: false,
  });

  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;

      const records = await pb.collection('ai_configs').getList(1, 1, {
        filter: `user = "${userId}"`,
      });

      if (records.items.length > 0) {
        const record = records.items[0];
        setConfigId(record.id);
        setConfig({
          provider: record.provider as AIProvider,
          apiKey: record.api_key || '',
          apiEndpoint: record.api_endpoint || '',
          model: record.model || '',
          isEnabled: record.is_enabled || false,
        });
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) throw new Error('Not authenticated');

      const data = {
        user: userId,
        provider: config.provider,
        api_key: config.apiKey,
        api_endpoint: config.apiEndpoint || null,
        model: config.model || aiAgentService.getDefaultModel(config.provider),
        is_enabled: config.isEnabled,
      };

      if (configId) {
        await pb.collection('ai_configs').update(configId, data);
      } else {
        const record = await pb.collection('ai_configs').create(data);
        setConfigId(record.id);
      }

      toast({ title: t('common.success'), description: t('settings.ai.saveSuccess') || 'AI settings saved' });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Configure the service
      aiAgentService.setConfig({
        provider: config.provider,
        apiKey: config.apiKey,
        apiEndpoint: config.apiEndpoint || undefined,
        model: config.model || undefined,
        isEnabled: true,
      });

      const response = await aiAgentService.chat([
        { role: 'user', content: 'Say "Hello! AI connection successful." in exactly those words.' },
      ]);

      setTestResult(response.content);
      toast({ title: t('common.success'), description: t('settings.ai.testSuccess') || 'Connection successful' });
    } catch (error: any) {
      setTestResult(`Error: ${error.message}`);
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Bot className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">{t('settings.ai.title') || 'AI Configuration'}</h1>
            <p className="text-muted-foreground mt-1">
              {t('settings.ai.description') || 'Configure AI assistant for RFQ analysis and more'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('settings.ai.provider') || 'AI Provider'}</CardTitle>
                <CardDescription>{t('settings.ai.providerDescription') || 'Select your AI service provider'}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="enabled">{t('common.enabled') || 'Enabled'}</Label>
                <Switch
                  id="enabled"
                  checked={config.isEnabled}
                  onCheckedChange={(checked) => setConfig({ ...config, isEnabled: checked })}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('settings.ai.provider') || 'Provider'}</Label>
              <Select
                value={config.provider}
                onValueChange={(value: AIProvider) => setConfig({ ...config, provider: value, model: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('settings.ai.apiKey') || 'API Key'}</Label>
              <Input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </div>

            {(config.provider === 'azure' || config.provider === 'custom') && (
              <div className="space-y-2">
                <Label>{t('settings.ai.endpoint') || 'API Endpoint'}</Label>
                <Input
                  value={config.apiEndpoint}
                  onChange={(e) => setConfig({ ...config, apiEndpoint: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('settings.ai.model') || 'Model'}</Label>
              <Input
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder={aiAgentService.getDefaultModel(config.provider) || 'Default model'}
              />
              <p className="text-sm text-muted-foreground">
                {t('settings.ai.modelHint') || `Leave empty to use default: ${aiAgentService.getDefaultModel(config.provider)}`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.ai.test') || 'Test Connection'}</CardTitle>
            <CardDescription>{t('settings.ai.testDescription') || 'Verify your AI configuration works'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleTest} disabled={isTesting || !config.apiKey} variant="outline">
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="mr-2 h-4 w-4" />
              )}
              {t('settings.ai.testButton') || 'Test Connection'}
            </Button>

            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.startsWith('Error') ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-800'}`}>
                <p className="text-sm">{testResult}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
