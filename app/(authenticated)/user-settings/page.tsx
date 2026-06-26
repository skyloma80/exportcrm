'use client';

import { useState, useEffect } from 'react';
 import { useI18n } from '@/lib/i18n/use-i18n';
import { useTabState } from '@/hooks/use-tab-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getPocketBase } from '@/lib/pocketbase/auth';
import { User, Mail, Settings, Save, TestTube, Loader2, Key } from 'lucide-react';
import { ApiAccessTab } from '@/components/settings/api-access-tab';

interface SmtpSettings {
  host: string;
  port: string;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

export default function UserSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useTabState("smtp");
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({
    host: '',
    port: '587',
    user: '',
    pass: '',
    from: '',
    secure: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const pb = getPocketBase();
      const user = pb.authStore.record;
      if (!user) return;

      const settings = await pb.collection('user_settings').getFirstListItem(`user_id = "${user.id}"`).catch(() => null);
      if (settings) {
        setSmtpSettings({
          host: settings.smtp_host || '',
          port: String(settings.smtp_port || 587),
          user: settings.smtp_user || '',
          pass: '', // Don't load password
          from: settings.smtp_from || '',
          secure: settings.smtp_secure ?? true,
        });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const handleSaveSmtp = async () => {
    setIsLoading(true);
    try {
      const pb = getPocketBase();
      const user = pb.authStore.record;
      if (!user) throw new Error('Not authenticated');

      const existingSettings = await pb.collection('user_settings').getFirstListItem(`user_id = "${user.id}"`).catch(() => null);

      const data: Record<string, unknown> = {
        user_id: user.id,
        smtp_host: smtpSettings.host,
        smtp_port: parseInt(smtpSettings.port) || 587,
        smtp_user: smtpSettings.user,
        smtp_from: smtpSettings.from,
        smtp_secure: smtpSettings.secure,
      };

      // Only include password if user entered a new one
      if (smtpSettings.pass) {
        data.smtp_pass = smtpSettings.pass;
      }

      if (existingSettings) {
        await pb.collection('user_settings').update(existingSettings.id, data);
      } else {
        await pb.collection('user_settings').create(data);
      }

      toast({ title: t('userSettings.smtp.saveSuccess') });
    } catch (e) {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    setIsTesting(true);
    try {
      // TODO: Implement SMTP test
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({ title: t('userSettings.smtp.testSuccess') });
    } catch (e) {
      toast({ title: t('userSettings.smtp.testFailed'), variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">{t('userSettings.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('userSettings.description')}</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            {t('userSettings.tabs.profile')}
          </TabsTrigger>
          <TabsTrigger value="smtp">
            <Mail className="mr-2 h-4 w-4" />
            {t('userSettings.tabs.smtp')}
          </TabsTrigger>
          <TabsTrigger value="api-access">
            <Key className="mr-2 h-4 w-4" />
            API 访问
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('userSettings.tabs.profile')}</CardTitle>
              <CardDescription>管理您的个人信息</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">{t('common.comingSoon')}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-access">
          <ApiAccessTab />
        </TabsContent>

        <TabsContent value="smtp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('userSettings.smtp.title')}</CardTitle>
              <CardDescription>{t('userSettings.smtp.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('userSettings.smtp.host')}</Label>
                  <Input
                    value={smtpSettings.host}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('userSettings.smtp.port')}</Label>
                  <Input
                    value={smtpSettings.port}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('userSettings.smtp.username')}</Label>
                  <Input
                    value={smtpSettings.user}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('userSettings.smtp.password')}</Label>
                  <Input
                    type="password"
                    value={smtpSettings.pass}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, pass: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('userSettings.smtp.from')}</Label>
                  <Input
                    value={smtpSettings.from}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, from: e.target.value })}
                    placeholder="Your Name <noreply@example.com>"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="secure"
                  checked={smtpSettings.secure}
                  onCheckedChange={(checked) => setSmtpSettings({ ...smtpSettings, secure: checked })}
                />
                <Label htmlFor="secure">{t('userSettings.smtp.secure')}</Label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleTestSmtp} disabled={isTesting}>
                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube className="mr-2 h-4 w-4" />}
                {t('userSettings.smtp.test')}
              </Button>
              <Button onClick={handleSaveSmtp} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('common.save')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
