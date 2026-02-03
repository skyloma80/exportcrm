'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/use-i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Ship, FileCheck, Truck, Warehouse, Shield, Loader2, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useServiceProviders, useServiceProviderMutations } from '@/hooks/collections/service-providers';
import { ServiceProvider, ServiceProviderType } from '@/lib/pocketbase/services/service-providers';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const TYPE_ICONS: Record<ServiceProviderType, LucideIcon> = {
  freight_forwarder: Ship,
  customs_broker: FileCheck,
  shipping_line: Ship,
  trucking: Truck,
  warehouse: Warehouse,
  inspection: Shield,
  insurance: Shield,
  other: Shield,
};

const TYPE_COLORS: Record<ServiceProviderType, string> = {
  freight_forwarder: 'bg-blue-100 text-blue-800',
  customs_broker: 'bg-green-100 text-green-800',
  shipping_line: 'bg-cyan-100 text-cyan-800',
  trucking: 'bg-orange-100 text-orange-800',
  warehouse: 'bg-purple-100 text-purple-800',
  inspection: 'bg-yellow-100 text-yellow-800',
  insurance: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function ServiceProvidersPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const { data: providers, loading, refetch } = useServiceProviders();
  const { remove, loading: mutating } = useServiceProviderMutations();
  
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<ServiceProvider | null>(null);

  const getDisplayName = (provider: ServiceProvider) => {
    if (locale === 'zh' && provider.name_cn) return provider.name_cn;
    return provider.name;
  };

  const filteredProviders = providers.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.name_cn && p.name_cn.toLowerCase().includes(search.toLowerCase())) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: providers.length,
    freight: providers.filter((p) => p.type === 'freight_forwarder').length,
    customs: providers.filter((p) => p.type === 'customs_broker').length,
    active: providers.filter((p) => p.is_active).length,
  };

  const handleDelete = async () => {
    if (!providerToDelete) return;
    try {
      await remove(providerToDelete.id);
      toast({
        title: t('common.success'),
        description: t('serviceProviders.deleteSuccess'),
      });
      refetch();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('serviceProviders.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('serviceProviders.description')}</p>
          </div>
          <Button onClick={() => router.push('/service-providers/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('serviceProviders.newProvider')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('serviceProviders.stats.total')}</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('serviceProviders.stats.freight')}</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Ship className="h-6 w-6 text-blue-500" />
              {stats.freight}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('serviceProviders.stats.customs')}</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-green-500" />
              {stats.customs}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('serviceProviders.stats.active')}</CardDescription>
            <CardTitle className="text-3xl">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('serviceProviders.listTitle')}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ship className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-1">{t('common.noData')}</p>
              <Button className="mt-4" onClick={() => router.push('/service-providers/new')}>
                <Plus className="mr-2 h-4 w-4" />
                {t('serviceProviders.newProvider')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('serviceProviders.columns.code')}</TableHead>
                  <TableHead>{t('serviceProviders.columns.name')}</TableHead>
                  <TableHead>{t('serviceProviders.columns.type')}</TableHead>
                  <TableHead>{t('serviceProviders.columns.contact')}</TableHead>
                  <TableHead>{t('serviceProviders.columns.phone')}</TableHead>
                  <TableHead>{t('serviceProviders.columns.status')}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders.map((provider) => {
                  const IconComponent = TYPE_ICONS[provider.type as ServiceProviderType] || Shield;
                  return (
                    <TableRow
                      key={provider.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/service-providers/${provider.id}`)}
                    >
                      <TableCell className="font-medium">{provider.code}</TableCell>
                      <TableCell>{getDisplayName(provider)}</TableCell>
                      <TableCell>
                        <Badge className={TYPE_COLORS[provider.type as ServiceProviderType] || TYPE_COLORS.other}>
                          <IconComponent className="h-3 w-3 mr-1" />
                          {t(`serviceProviders.type.${provider.type}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>{provider.contact_name || '-'}</TableCell>
                      <TableCell>{provider.contact_phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={provider.is_active ? 'default' : 'secondary'}>
                          {provider.is_active ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/service-providers/${provider.id}`);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('common.view')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/service-providers/${provider.id}/edit`);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProviderToDelete(provider);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('serviceProviders.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {providerToDelete?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={mutating}
            >
              {mutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
