'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Key, Copy, Check } from 'lucide-react';
import { getPocketBase } from '@/lib/pocketbase/auth';

export function ApiAccessTab() {
  const { locale } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [tokenRevealed, setTokenRevealed] = useState(false);

  const pb = getPocketBase();
  const token = pb.authStore.token;
  const apiUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast({ title: locale === 'zh' ? '已复制' : 'Copied' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: locale === 'zh' ? '复制失败' : 'Copy failed', variant: 'destructive' });
    }
  };

  const handleRefreshToken = async () => {
    try {
      await pb.collection('users').authRefresh();
      toast({ title: locale === 'zh' ? 'Token 已刷新' : 'Token refreshed' });
    } catch (e: any) {
      toast({ title: locale === 'zh' ? '刷新失败' : 'Refresh failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Key className="h-5 w-5" />
          {locale === 'zh' ? 'API 访问' : 'API Access'}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {locale === 'zh'
            ? '使用以下 Token，AI 智能体可通过 PocketBase SDK 直接操作 CRM'
            : 'Use this token for AI agents to operate CRM via PocketBase SDK'}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">{locale === 'zh' ? 'API 地址' : 'API URL'}</label>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">{apiUrl}</code>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(apiUrl); toast({ title: locale === 'zh' ? '已复制' : 'Copied' }); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">
            {locale === 'zh' ? '认证 Token' : 'Auth Token'}
            <span className="text-xs text-muted-foreground ml-2">
              ({locale === 'zh' ? '用户' : 'User'}: {user?.email})
            </span>
          </label>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono truncate">
              {tokenRevealed ? token : token.substring(0, 20) + '...'}
            </code>
            <Button variant="outline" size="sm" onClick={() => setTokenRevealed(!tokenRevealed)}>
              {tokenRevealed ? (locale === 'zh' ? '隐藏' : 'Hide') : (locale === 'zh' ? '显示' : 'Show')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyToken}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefreshToken}>
              {locale === 'zh' ? '刷新' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-muted p-4">
        <h4 className="text-sm font-medium mb-2">
          {locale === 'zh' ? '🤖 AI 智能体使用说明' : '🤖 AI Agent Setup'}
        </h4>
        <div className="text-sm text-muted-foreground space-y-1 font-mono">
          <p>{locale === 'zh' ? '在 AGENTS.md 中配置 Token:' : 'Configure in AGENTS.md:'}</p>
          <pre className="bg-background p-2 rounded text-xs">{`CRM_API_URL=${apiUrl}
CRM_API_TOKEN=${token.substring(0, 20)}...`}</pre>
          <p className="mt-2">
            {locale === 'zh' ? '智能体使用 PocketBase JS SDK 连接:' : 'Agent connects via PocketBase JS SDK:'}
          </p>
          <pre className="bg-background p-2 rounded text-xs">{`import PocketBase from 'pocketbase'
const pb = new PocketBase(process.env.CRM_API_URL)
pb.authStore.save(process.env.CRM_API_TOKEN, null)`}</pre>
        </div>
      </div>
    </div>
  );
}
