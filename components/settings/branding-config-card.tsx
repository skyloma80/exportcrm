'use client';

import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Building2, Globe, User, Upload, X, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { brandingService } from '@/lib/services/branding-service';
import { BrandingConfig, DEFAULT_BRANDING_CONFIG } from '@/lib/branding/types';

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (base64: string) => void;
  accept?: string;
}

function ImageUpload({ label, value, onChange, accept = 'image/*' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type - only allow images, not PDFs
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      alert(t('settings.branding.pdfNotAllowed') || 'PDF files are not allowed. Please upload an image (PNG, JPG, SVG).');
      return;
    }

    // Check file size (max 500KB for base64 storage)
    if (file.size > 500 * 1024) {
      alert(t('settings.branding.imageTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {t('common.upload')}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
          >
            <X className="h-4 w-4 mr-2" />
            {t('common.clear')}
          </Button>
        )}
      </div>
      {value && (
        <div className="mt-2 p-2 border rounded-md bg-muted/50">
          <img
            src={value}
            alt={label}
            className="max-h-16 max-w-[200px] object-contain"
          />
        </div>
      )}
      {!value && (
        <div className="mt-2 p-4 border rounded-md bg-muted/30 flex items-center justify-center text-muted-foreground">
          <ImageIcon className="h-8 w-8" />
        </div>
      )}
    </div>
  );
}

// Logo 上传组件 - 支持上传到 S3 获取公开 URL
interface LogoUploadProps {
  base64Value: string;
  urlValue: string;
  onBase64Change: (base64: string) => void;
  onUrlChange: (url: string) => void;
}

function LogoUpload({ base64Value, urlValue, onBase64Change, onUrlChange }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type - only allow images, not PDFs
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: t('settings.branding.pdfNotAllowed') || 'PDF files are not allowed', variant: 'destructive' });
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t('settings.branding.imageTooLarge'), variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      // 1. 读取为 base64 (用于 PDF)
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        onBase64Change(base64);
      };
      reader.readAsDataURL(file);

      // 2. 上传到 S3 获取公开 URL (用于邮件)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'branding');

      const response = await fetch('/api/disk/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        // 构建公开 URL
        const s3BaseUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL || '';
        if (s3BaseUrl && result.path) {
          const publicUrl = `${s3BaseUrl}/${result.path}`;
          onUrlChange(publicUrl);
          toast({ title: t('common.success'), description: 'Logo uploaded to S3' });
        }
      } else {
        console.error('S3 upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    onBase64Change('');
    onUrlChange('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const displayValue = base64Value || (urlValue ? urlValue : '');

  return (
    <div className="space-y-2">
      <Label>{t('settings.branding.logo')}</Label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {t('common.upload')}
        </Button>
        {displayValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
          >
            <X className="h-4 w-4 mr-2" />
            {t('common.clear')}
          </Button>
        )}
      </div>
      {displayValue && (
        <div className="mt-2 p-2 border rounded-md bg-muted/50">
          <img
            src={displayValue}
            alt="Logo"
            className="max-h-16 max-w-[200px] object-contain"
          />
        </div>
      )}
      {urlValue && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <LinkIcon className="h-3 w-3" />
          <span className="truncate max-w-[250px]">{urlValue}</span>
        </div>
      )}
      {!displayValue && (
        <div className="mt-2 p-4 border rounded-md bg-muted/30 flex items-center justify-center text-muted-foreground">
          <ImageIcon className="h-8 w-8" />
        </div>
      )}
    </div>
  );
}

export function BrandingConfigCard() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<BrandingConfig>(DEFAULT_BRANDING_CONFIG);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await brandingService.getBrandingConfig();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load branding config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await brandingService.updateBrandingConfig(config);
      toast({ title: t('common.success') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePrimaryOffice = (field: string, value: string) => {
    setConfig({
      ...config,
      primary_office: { ...config.primary_office, [field]: value },
    });
  };

  const updateSecondaryOffice = (field: string, value: string) => {
    setConfig({
      ...config,
      secondary_office: { ...config.secondary_office, [field]: value },
    });
  };

  const updateSigner = (field: string, value: string) => {
    setConfig({
      ...config,
      default_signer: { ...config.default_signer, [field]: value },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {t('settings.branding.title')}
        </CardTitle>
        <CardDescription>{t('settings.branding.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Images Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {t('settings.branding.images')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LogoUpload
              base64Value={config.logo_base64}
              urlValue={config.logo_url || ''}
              onBase64Change={(base64) => setConfig({ ...config, logo_base64: base64 })}
              onUrlChange={(url) => setConfig({ ...config, logo_url: url })}
            />
            <ImageUpload
              label={t('settings.branding.stamp')}
              value={config.stamp_base64}
              onChange={(base64) => setConfig({ ...config, stamp_base64: base64 })}
              accept="image/png,image/jpeg,image/svg+xml"
            />
            <ImageUpload
              label={t('settings.branding.signature')}
              value={config.signature_base64}
              onChange={(base64) => setConfig({ ...config, signature_base64: base64 })}
              accept="image/png,image/jpeg,image/svg+xml"
            />
          </div>
          {/* Email Logo URL - 手动输入 */}
          <div className="space-y-2 pt-2">
            <Label className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              {t('settings.branding.emailLogoUrl')}
            </Label>
            <Input
              value={config.logo_url || ''}
              onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
              placeholder="https://your-s3-bucket.s3.amazonaws.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.branding.emailLogoUrlHint')}
            </p>
          </div>
        </div>

        {/* Website */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('settings.branding.website')}
          </h3>
          <div className="space-y-2">
            <Label>{t('settings.branding.websiteUrl')}</Label>
            <Input
              value={config.website_url}
              onChange={(e) => setConfig({ ...config, website_url: e.target.value })}
              placeholder="www.alustars.com"
            />
          </div>
        </div>

        {/* Primary Office */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-medium">{t('settings.branding.primaryOffice')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('settings.branding.nameEn')}</Label>
              <Input
                value={config.primary_office.name}
                onChange={(e) => updatePrimaryOffice('name', e.target.value)}
                placeholder="Chongqing Alustars..."
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.branding.nameCn')}</Label>
              <Input
                value={config.primary_office.name_cn}
                onChange={(e) => updatePrimaryOffice('name_cn', e.target.value)}
                placeholder="重庆阿鲁斯达..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('settings.branding.addressEn')}</Label>
              <Textarea
                value={config.primary_office.address}
                onChange={(e) => updatePrimaryOffice('address', e.target.value)}
                placeholder="Full address in English"
                rows={2}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('settings.branding.addressCn')}</Label>
              <Textarea
                value={config.primary_office.address_cn}
                onChange={(e) => updatePrimaryOffice('address_cn', e.target.value)}
                placeholder="中文完整地址"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.branding.phone')}</Label>
              <Input
                value={config.primary_office.phone || ''}
                onChange={(e) => updatePrimaryOffice('phone', e.target.value)}
                placeholder="(+86) 23-12345678"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.branding.email')}</Label>
              <Input
                type="email"
                value={config.primary_office.email || ''}
                onChange={(e) => updatePrimaryOffice('email', e.target.value)}
                placeholder="info@alustars.com"
              />
            </div>
          </div>
        </div>

        {/* Secondary Office */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-medium">{t('settings.branding.secondaryOffice')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('settings.branding.nameEn')}</Label>
              <Input
                value={config.secondary_office.name}
                onChange={(e) => updateSecondaryOffice('name', e.target.value)}
                placeholder="ALUSTARS INTERNATIONAL..."
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.branding.nameCn')}</Label>
              <Input
                value={config.secondary_office.name_cn}
                onChange={(e) => updateSecondaryOffice('name_cn', e.target.value)}
                placeholder="阿鲁斯达国际..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('settings.branding.addressEn')}</Label>
              <Textarea
                value={config.secondary_office.address}
                onChange={(e) => updateSecondaryOffice('address', e.target.value)}
                placeholder="Valencia 264 Principal, 08007 Barcelona (Spain)"
                rows={2}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('settings.branding.addressCn')}</Label>
              <Textarea
                value={config.secondary_office.address_cn}
                onChange={(e) => updateSecondaryOffice('address_cn', e.target.value)}
                placeholder="西班牙巴塞罗那..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.branding.phone')}</Label>
              <Input
                value={config.secondary_office.phone || ''}
                onChange={(e) => updateSecondaryOffice('phone', e.target.value)}
                placeholder="(+34) 607630594"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.branding.email')}</Label>
              <Input
                type="email"
                value={config.secondary_office.email || ''}
                onChange={(e) => updateSecondaryOffice('email', e.target.value)}
                placeholder="c.feliu@alustars.com"
              />
            </div>
          </div>
        </div>

        {/* Default Signer */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('settings.branding.defaultSigner')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('settings.branding.signerNameEn')}</Label>
              <Input
                value={config.default_signer.name}
                onChange={(e) => updateSigner('name', e.target.value)}
                placeholder="Carlos Feliu"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.branding.signerNameCn')}</Label>
              <Input
                value={config.default_signer.name_cn}
                onChange={(e) => updateSigner('name_cn', e.target.value)}
                placeholder="Carlos Feliu"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.branding.signerTitleEn')}</Label>
              <Input
                value={config.default_signer.title}
                onChange={(e) => updateSigner('title', e.target.value)}
                placeholder="VP of Business Development"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.branding.signerTitleCn')}</Label>
              <Input
                value={config.default_signer.title_cn}
                onChange={(e) => updateSigner('title_cn', e.target.value)}
                placeholder="业务发展副总裁"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {t('common.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default BrandingConfigCard;
