"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { CreditCard, Plus, Pencil, Trash2, Star, Loader2, Upload, Download } from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { RemittanceForm } from "@/components/settings/remittance-form"
import { remittanceService, type Remittance, type RemittanceCreateInput } from "@/lib/pocketbase/services/remittance"

export default function RemittancePage() {
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  
  const isAdmin = user?.role === "admin"
  
  const [items, setItems] = useState<Remittance[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Remittance | null>(null)
  const [deleteItem, setDeleteItem] = useState<Remittance | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadItems = async () => {
    try {
      const data = await remittanceService.getAll()
      setItems(data)
    } catch (err) {
      console.error("Error loading remittance:", err)
      toast({
        title: t("common.error"),
        description: locale === 'zh' ? '加载汇款模板失败' : 'Failed to load remittance',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  useEffect(() => {
    if (user && !isAdmin) {
      toast({
        title: locale === 'zh' ? "无权限" : "No Permission",
        description: locale === 'zh' ? "只有管理员可以管理汇款模板" : "Only admins can manage remittance",
        variant: "destructive",
      })
      router.push("/settings")
    }
  }, [user, isAdmin, router, locale, toast])

  const handleCreate = async (data: RemittanceCreateInput) => {
    setSubmitting(true)
    try {
      await remittanceService.createItem(data)
      toast({
        title: t("common.success"),
        description: locale === 'zh' ? '汇款模板创建成功' : 'Remittance template created',
      })
      setDialogOpen(false)
      loadItems()
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

  const handleUpdate = async (data: RemittanceCreateInput) => {
    if (!editingItem) return
    setSubmitting(true)
    try {
      await remittanceService.updateItem(editingItem.id, data)
      toast({
        title: t("common.success"),
        description: locale === 'zh' ? '汇款模板更新成功' : 'Remittance template updated',
      })
      setEditingItem(null)
      loadItems()
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
    if (!deleteItem) return
    try {
      await remittanceService.delete(deleteItem.id)
      toast({
        title: t("common.success"),
        description: locale === 'zh' ? '汇款模板已删除' : 'Remittance template deleted',
      })
      setDeleteItem(null)
      loadItems()
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      })
    }
  }

  const handleSetDefault = async (item: Remittance) => {
    try {
      await remittanceService.setAsDefault(item.id)
      toast({
        title: t("common.success"),
        description: locale === 'zh' ? '已设为默认模板' : 'Set as default',
      })
      loadItems()
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      })
    }
  }

  const handleExport = () => {
    const data = items.map(item => ({
      name: item.name,
      items: item.items,
      is_default: item.is_default,
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'remittance.json'
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: t("common.success"),
      description: locale === 'zh' ? '导出成功' : 'Export successful',
    })
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      toast({
        title: t("common.error"),
        description: locale === 'zh' ? '请选择 JSON 文件' : 'Please select a JSON file',
        variant: "destructive",
      })
      return
    }

    setImporting(true)
    try {
      const content = await file.text()
      const data = JSON.parse(content)

      if (!Array.isArray(data)) {
        throw new Error(locale === 'zh' ? 'JSON 格式错误' : 'Invalid JSON format')
      }

      let created = 0
      let updated = 0
      for (const item of data) {
        if (!item.name) continue

        const existing = await remittanceService.getFirstListItem(`name = "${item.name}"`)
        if (existing) {
          await remittanceService.updateItem(existing.id, item)
          updated++
        } else {
          await remittanceService.createItem(item)
          created++
        }
      }

      toast({
        title: t("common.success"),
        description: locale === 'zh' 
          ? `导入成功：新增 ${created} 条，更新 ${updated} 条` 
          : `Import successful: ${created} created, ${updated} updated`,
      })
      loadItems()
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
            <CreditCard className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">
                {locale === 'zh' ? '汇款模板管理' : 'Remittance Templates'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {locale === 'zh' ? '配置汇款指令模板，在订单中快速引用' : 'Configure remittance templates for quick reference in orders'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={items.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              {locale === 'zh' ? '导出' : 'Export'}
            </Button>
            <Button variant="outline" onClick={handleImportClick} disabled={importing}>
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {locale === 'zh' ? '导入' : 'Import'}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {locale === 'zh' ? '添加模板' : 'Add Template'}
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {locale === 'zh' ? '暂无汇款模板' : 'No remittance templates yet'}
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {locale === 'zh' ? '添加第一个模板' : 'Add your first template'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className={item.is_default ? "border-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {item.name}
                    {item.is_default && (
                      <Badge variant="default" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        {locale === 'zh' ? '默认' : 'Default'}
                      </Badge>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="bg-muted p-2 rounded overflow-auto max-h-40">
                  {item.items && item.items.length > 0 ? (
                    <div className="space-y-1">
                      {item.items.map((line, index) => (
                        <div key={index} className="text-xs">
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">
                      {locale === 'zh' ? '暂无内容' : 'No content'}
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingItem(item)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    {t("common.edit")}
                  </Button>
                  {!item.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(item)}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      {locale === 'zh' ? '设为默认' : 'Set Default'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteItem(item)}
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
            <DialogTitle>{locale === 'zh' ? '添加汇款模板' : 'Add Remittance Template'}</DialogTitle>
            <DialogDescription>
              {locale === 'zh' ? '配置汇款指令模板信息' : 'Configure remittance template information'}
            </DialogDescription>
          </DialogHeader>
          <RemittanceForm
            onSubmit={handleCreate}
            isLoading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{locale === 'zh' ? '编辑汇款模板' : 'Edit Remittance Template'}</DialogTitle>
            <DialogDescription>
              {locale === 'zh' ? '修改汇款模板信息' : 'Modify remittance template information'}
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <RemittanceForm
              initialData={editingItem}
              onSubmit={handleUpdate}
              isLoading={submitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{locale === 'zh' ? '确认删除' : 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {locale === 'zh' 
                ? `确定要删除汇款模板 "${deleteItem?.name}" 吗？此操作无法撤销。`
                : `Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`}
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