"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Building2, Plus, Pencil, Trash2, Star, Loader2, ShieldAlert } from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { BankAccountForm } from "@/components/settings/bank-account-form"
import { bankAccountService, type BankAccount, type BankAccountCreateInput } from "@/lib/pocketbase/services/bank-accounts"

export default function BankAccountsPage() {
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  
  const isAdmin = user?.role === "admin"
  
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [deleteAccount, setDeleteAccount] = useState<BankAccount | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadAccounts = async () => {
    try {
      const data = await bankAccountService.getAll()
      setAccounts(data)
    } catch (err) {
      console.error("Error loading bank accounts:", err)
      toast({
        title: t("common.error"),
        description: locale === 'zh' ? '加载银行账户失败' : 'Failed to load bank accounts',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  // Redirect non-admin users
  useEffect(() => {
    if (user && !isAdmin) {
      toast({
        title: locale === 'zh' ? "无权限" : "No Permission",
        description: locale === 'zh' ? "只有管理员可以管理银行账户" : "Only admins can manage bank accounts",
        variant: "destructive",
      })
      router.push("/settings")
    }
  }, [user, isAdmin, router, locale, toast])

  const handleCreate = async (data: BankAccountCreateInput) => {
    setSubmitting(true)
    try {
      await bankAccountService.createAccount(data)
      toast({
        title: t("common.success"),
        description: locale === 'zh' ? '银行账户创建成功' : 'Bank account created',
      })
      setDialogOpen(false)
      loadAccounts()
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (data: BankAccountCreateInput) => {
    if (!editingAccount) return
    setSubmitting(true)
    try {
      await bankAccountService.updateAccount(editingAccount.id, data)
      toast({
        title: t("common.success"),
        description: locale === 'zh' ? '银行账户更新成功' : 'Bank account updated',
      })
      setEditingAccount(null)
      loadAccounts()
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteAccount) return
    try {
      await bankAccountService.delete(deleteAccount.id)
      toast({
        title: t("common.success"),
        description: locale === 'zh' ? '银行账户已删除' : 'Bank account deleted',
      })
      setDeleteAccount(null)
      loadAccounts()
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      })
    }
  }

  const handleSetDefault = async (account: BankAccount) => {
    try {
      await bankAccountService.setAsDefault(account.id)
      toast({
        title: t("common.success"),
        description: locale === 'zh' ? '已设为默认账户' : 'Set as default',
      })
      loadAccounts()
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      })
    }
  }

  if (loading || !isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">
                {locale === 'zh' ? '银行账户管理' : 'Bank Accounts'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {locale === 'zh' ? '配置公司银行账户，在订单中快速引用' : 'Configure company bank accounts for quick reference in orders'}
              </p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {locale === 'zh' ? '添加账户' : 'Add Account'}
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {locale === 'zh' ? '暂无银行账户' : 'No bank accounts yet'}
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {locale === 'zh' ? '添加第一个账户' : 'Add your first account'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className={account.is_default ? "border-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {account.name}
                    {account.is_default && (
                      <Badge variant="default" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        {locale === 'zh' ? '默认' : 'Default'}
                      </Badge>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                  {account.content}
                </pre>
                
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingAccount(account)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    {t("common.edit")}
                  </Button>
                  {!account.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(account)}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      {locale === 'zh' ? '设为默认' : 'Set Default'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteAccount(account)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{locale === 'zh' ? '添加银行账户' : 'Add Bank Account'}</DialogTitle>
            <DialogDescription>
              {locale === 'zh' ? '配置公司银行账户信息' : 'Configure company bank account information'}
            </DialogDescription>
          </DialogHeader>
          <BankAccountForm
            onSubmit={handleCreate}
            isLoading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{locale === 'zh' ? '编辑银行账户' : 'Edit Bank Account'}</DialogTitle>
            <DialogDescription>
              {locale === 'zh' ? '修改银行账户信息' : 'Modify bank account information'}
            </DialogDescription>
          </DialogHeader>
          {editingAccount && (
            <BankAccountForm
              initialData={editingAccount}
              onSubmit={handleUpdate}
              isLoading={submitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAccount} onOpenChange={(open) => !open && setDeleteAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{locale === 'zh' ? '确认删除' : 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {locale === 'zh' 
                ? `确定要删除银行账户 "${deleteAccount?.name}" 吗？此操作无法撤销。`
                : `Are you sure you want to delete "${deleteAccount?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
