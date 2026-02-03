"use client"

/**
 * Supplier Detail Page
 * 供应商详情页
 */

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/lib/i18n/use-i18n"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { 
  Edit, 
  Factory, 
  Star,
  User,
  Mail,
  Phone,
  Building2,
  CreditCard,
  Globe,
  Award,
  Settings,
  Plus,
  Loader2,
  Package,
  Pencil,
  Trash2
} from "lucide-react"
import { 
  Supplier, 
  SupplierContact, 
  SupplierBankAccount
} from "@/lib/pocketbase/services/suppliers"
import { useToast } from "@/hooks/use-toast"
import { useTabState } from "@/hooks/use-tab-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function SupplierDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()
  const id = params.id as string
  const [activeTab, setActiveTab] = useTabState("info")

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [contacts, setContacts] = useState<SupplierContact[]>([])
  const [bankAccounts, setBankAccounts] = useState<SupplierBankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Set breadcrumb when supplier loads
  useEffect(() => {
    if (supplier) {
      const displayName = locale === 'zh' && supplier.name_cn ? supplier.name_cn : supplier.name
      setBreadcrumb([
        { label: t("nav.suppliers"), href: "/suppliers" },
        { label: displayName },
      ])
    }
    return () => setBreadcrumb([])
  }, [supplier, setBreadcrumb, t, locale])
  
  // Contact dialog state
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [contactSaving, setContactSaving] = useState(false)
  const [editingContact, setEditingContact] = useState<SupplierContact | null>(null)
  const [newContact, setNewContact] = useState({
    name: "",
    position: "",
    email: "",
    phone: "",
    wechat: "",
    is_primary: false,
  })
  
  // Delete confirmation state
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Bank account dialog state
  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [bankSaving, setBankSaving] = useState(false)
  const [newBankAccount, setNewBankAccount] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    swift_code: "",
    currency: "USD",
    is_default: false,
  })


  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    setError(null)

    try {
      const pb = getPocketBase()
      const [supplierData, contactsData, accountsData] = await Promise.all([
        pb.collection("suppliers").getOne<Supplier>(id),
        pb.collection("supplier_contacts").getFullList<SupplierContact>({
          filter: `supplier = "${id}"`,
          sort: "-is_primary,-created",
        }),
        pb.collection("supplier_bank_accounts").getFullList<SupplierBankAccount>({
          filter: `supplier = "${id}"`,
          sort: "-is_default,-created",
        }),
      ])
      setSupplier(supplierData)
      setContacts(contactsData)
      setBankAccounts(accountsData)
    } catch (err: any) {
      console.error("Error loading supplier:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = () => {
    if (!supplier) return ""
    if (locale === 'zh' && supplier.name_cn) return supplier.name_cn
    return supplier.name
  }

  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'manufacturer': return 'default'
      case 'trader': return 'secondary'
      case 'agent': return 'outline'
      default: return 'secondary'
    }
  }

  const renderRating = (rating?: number) => {
    if (!rating) return <span className="text-muted-foreground">-</span>
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
          />
        ))}
      </div>
    )
  }

  const handleAddContact = async () => {
    if (!newContact.name.trim()) return
    setContactSaving(true)
    try {
      const pb = getPocketBase()
      if (editingContact) {
        // Update existing contact
        await pb.collection("supplier_contacts").update(editingContact.id, newContact)
        toast({
          title: locale === 'zh' ? '更新成功' : 'Contact updated',
          description: locale === 'zh' ? '联系人已更新' : 'Contact has been updated',
        })
      } else {
        // Create new contact
        await pb.collection("supplier_contacts").create({
          supplier: id,
          ...newContact,
        })
        toast({
          title: locale === 'zh' ? '添加成功' : 'Contact added',
          description: locale === 'zh' ? '联系人已添加' : 'Contact has been added',
        })
      }
      setContactDialogOpen(false)
      setEditingContact(null)
      setNewContact({ name: "", position: "", email: "", phone: "", wechat: "", is_primary: false })
      loadData()
    } catch (err: any) {
      console.error("Error saving contact:", err)
      toast({
        title: locale === 'zh' ? '保存失败' : 'Failed to save',
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setContactSaving(false)
    }
  }

  const handleEditContact = (contact: SupplierContact) => {
    setEditingContact(contact)
    setNewContact({
      name: contact.name || "",
      position: contact.position || "",
      email: contact.email || "",
      phone: contact.phone || "",
      wechat: contact.wechat || "",
      is_primary: contact.is_primary || false,
    })
    setContactDialogOpen(true)
  }

  const handleDeleteContact = async () => {
    if (!deleteContactId) return
    setDeleting(true)
    try {
      const pb = getPocketBase()
      await pb.collection("supplier_contacts").delete(deleteContactId)
      toast({
        title: locale === 'zh' ? '删除成功' : 'Contact deleted',
        description: locale === 'zh' ? '联系人已删除' : 'Contact has been deleted',
      })
      setDeleteContactId(null)
      loadData()
    } catch (err: any) {
      console.error("Error deleting contact:", err)
      toast({
        title: locale === 'zh' ? '删除失败' : 'Failed to delete',
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const openAddContactDialog = () => {
    setEditingContact(null)
    setNewContact({ name: "", position: "", email: "", phone: "", wechat: "", is_primary: false })
    setContactDialogOpen(true)
  }

  const handleAddBankAccount = async () => {
    if (!newBankAccount.bank_name.trim() || !newBankAccount.account_number.trim()) return
    setBankSaving(true)
    try {
      const pb = getPocketBase()
      await pb.collection("supplier_bank_accounts").create({
        supplier: id,
        ...newBankAccount,
      })
      toast({
        title: locale === 'zh' ? '添加成功' : 'Bank account added',
        description: locale === 'zh' ? '银行账号已添加' : 'Bank account has been added',
      })
      setBankDialogOpen(false)
      setNewBankAccount({ bank_name: "", account_name: "", account_number: "", swift_code: "", currency: "USD", is_default: false })
      loadData()
    } catch (err: any) {
      console.error("Error adding bank account:", err)
      toast({
        title: locale === 'zh' ? '添加失败' : 'Failed to add',
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setBankSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>{t("common.error")}: {error?.message || t("suppliers.notFound")}</p>
              <Button variant="outline" onClick={() => router.back()} className="mt-4">
                {t("common.back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Factory className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold">{getDisplayName()}</h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground font-mono">{supplier.code}</span>
              <Badge variant={getTypeVariant(supplier.type)}>
                {t(`suppliers.type.${supplier.type}`)}
              </Badge>
              {renderRating(supplier.rating)}
            </div>
          </div>
          <Button onClick={() => router.push(`/suppliers/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t("common.edit")}
          </Button>
        </div>
      </div>


      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">{t("suppliers.tabs.info")}</TabsTrigger>
          <TabsTrigger value="contacts">{t("suppliers.tabs.contacts")} ({contacts.length})</TabsTrigger>
          <TabsTrigger value="bank">{t("suppliers.tabs.bank")} ({bankAccounts.length})</TabsTrigger>
          <TabsTrigger value="products">{t("suppliers.tabs.products")}</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>{t("suppliers.info.basic")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">{t("suppliers.columns.name")}</div>
                    <div className="font-medium">{supplier.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t("suppliers.columns.nameCn")}</div>
                    <div className="font-medium">{supplier.name_cn || "-"}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t("suppliers.columns.country")}</div>
                  <div className="font-medium">{supplier.country || "-"}</div>
                </div>
              </CardContent>
            </Card>

            {/* Right Column - Address */}
            <Card>
              <CardHeader>
                <CardTitle>{t("suppliers.info.address")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">{t("suppliers.columns.address")}</div>
                  <div className="font-medium whitespace-pre-wrap">{supplier.address || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t("suppliers.columns.addressCn")}</div>
                  <div className="font-medium whitespace-pre-wrap">{supplier.address_cn || "-"}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Capabilities & Certifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {t("suppliers.info.capabilities")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {supplier.capabilities && supplier.capabilities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {supplier.capabilities.map((cap, i) => (
                      <Badge key={i} variant="secondary">{cap}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">-</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  {t("suppliers.info.certifications")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {supplier.certifications && supplier.certifications.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {supplier.certifications.map((cert, i) => (
                      <Badge key={i} variant="outline">{cert}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">-</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Remarks */}
          <Card>
            <CardHeader>
              <CardTitle>{t("suppliers.info.remarks")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{supplier.remarks || "-"}</p>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("suppliers.contacts.title")}
                </CardTitle>
                <CardDescription>{t("suppliers.contacts.description")}</CardDescription>
              </div>
              <Button onClick={openAddContactDialog}>
                <Plus className="mr-2 h-4 w-4" />
                {locale === 'zh' ? '添加联系人' : 'Add Contact'}
              </Button>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t("suppliers.contacts.empty")}</p>
              ) : (
                <div className="space-y-4">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{contact.name}</span>
                          {contact.is_primary && (
                            <Badge variant="default" className="text-xs">{t("common.primary")}</Badge>
                          )}
                        </div>
                        {contact.position && (
                          <p className="text-sm text-muted-foreground">{contact.position}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm">
                          {contact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                                {contact.email}
                              </a>
                            </span>
                          )}
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {contact.phone}
                            </span>
                          )}
                          {contact.wechat && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3.5 w-3.5" />
                              {contact.wechat}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditContact(contact)}
                          title={locale === 'zh' ? '编辑' : 'Edit'}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteContactId(contact.id)}
                          title={locale === 'zh' ? '删除' : 'Delete'}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Bank Accounts Tab */}
        <TabsContent value="bank">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t("suppliers.bank.title")}
                </CardTitle>
                <CardDescription>{t("suppliers.bank.description")}</CardDescription>
              </div>
              <Button onClick={() => setBankDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {locale === 'zh' ? '添加银行账号' : 'Add Bank Account'}
              </Button>
            </CardHeader>
            <CardContent>
              {bankAccounts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t("suppliers.bank.empty")}</p>
              ) : (
                <div className="space-y-4">
                  {bankAccounts.map((account) => (
                    <div key={account.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{account.bank_name}</span>
                          {account.is_default && (
                            <Badge variant="default" className="text-xs">{t("common.default")}</Badge>
                          )}
                          {account.currency && (
                            <Badge variant="outline" className="text-xs">{account.currency}</Badge>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <p><span className="text-muted-foreground">{t("suppliers.bank.accountName")}:</span> {account.account_name}</p>
                          <p><span className="text-muted-foreground">{t("suppliers.bank.accountNumber")}:</span> {account.account_number}</p>
                          {account.swift_code && (
                            <p><span className="text-muted-foreground">{t("suppliers.bank.swiftCode")}:</span> {account.swift_code}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t("suppliers.products.title")}
                </CardTitle>
                <CardDescription>{t("suppliers.products.description")}</CardDescription>
              </div>
              <Button variant="outline" onClick={() => router.push(`/rfqs?supplier=${id}`)}>
                {locale === 'zh' ? '查看相关询价' : 'View Related RFQs'}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                {locale === 'zh' ? '供应商产品关联功能开发中，您可以通过询价管理查看该供应商的报价产品' : 'Supplier product association is under development. You can view quoted products through RFQ management.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={(open) => {
        setContactDialogOpen(open)
        if (!open) {
          setEditingContact(null)
          setNewContact({ name: "", position: "", email: "", phone: "", wechat: "", is_primary: false })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact 
                ? (locale === 'zh' ? '编辑联系人' : 'Edit Contact')
                : (locale === 'zh' ? '添加联系人' : 'Add Contact')
              }
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? (locale === 'zh' ? '修改供应商联系人信息' : 'Edit supplier contact information')
                : (locale === 'zh' ? '添加供应商联系人信息' : 'Add supplier contact information')
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '姓名' : 'Name'} *</Label>
              <Input
                value={newContact.name}
                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                placeholder={locale === 'zh' ? '输入联系人姓名' : 'Enter contact name'}
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '职位' : 'Position'}</Label>
              <Input
                value={newContact.position}
                onChange={(e) => setNewContact(prev => ({ ...prev, position: e.target.value }))}
                placeholder={locale === 'zh' ? '输入职位' : 'Enter position'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{locale === 'zh' ? '邮箱' : 'Email'}</Label>
                <Input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{locale === 'zh' ? '电话' : 'Phone'}</Label>
                <Input
                  value={newContact.phone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder={locale === 'zh' ? '输入电话号码' : 'Enter phone number'}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '微信' : 'WeChat'}</Label>
              <Input
                value={newContact.wechat}
                onChange={(e) => setNewContact(prev => ({ ...prev, wechat: e.target.value }))}
                placeholder={locale === 'zh' ? '输入微信号' : 'Enter WeChat ID'}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_primary"
                checked={newContact.is_primary}
                onCheckedChange={(checked) => setNewContact(prev => ({ ...prev, is_primary: !!checked }))}
              />
              <Label htmlFor="is_primary">{locale === 'zh' ? '设为主要联系人' : 'Set as primary contact'}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddContact} disabled={contactSaving || !newContact.name.trim()}>
              {contactSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bank Account Dialog */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{locale === 'zh' ? '添加银行账号' : 'Add Bank Account'}</DialogTitle>
            <DialogDescription>
              {locale === 'zh' ? '添加供应商银行账号信息' : 'Add supplier bank account information'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '银行名称' : 'Bank Name'} *</Label>
              <Input
                value={newBankAccount.bank_name}
                onChange={(e) => setNewBankAccount(prev => ({ ...prev, bank_name: e.target.value }))}
                placeholder={locale === 'zh' ? '输入银行名称' : 'Enter bank name'}
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '账户名称' : 'Account Name'}</Label>
              <Input
                value={newBankAccount.account_name}
                onChange={(e) => setNewBankAccount(prev => ({ ...prev, account_name: e.target.value }))}
                placeholder={locale === 'zh' ? '输入账户名称' : 'Enter account name'}
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '账号' : 'Account Number'} *</Label>
              <Input
                value={newBankAccount.account_number}
                onChange={(e) => setNewBankAccount(prev => ({ ...prev, account_number: e.target.value }))}
                placeholder={locale === 'zh' ? '输入银行账号' : 'Enter account number'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SWIFT Code</Label>
                <Input
                  value={newBankAccount.swift_code}
                  onChange={(e) => setNewBankAccount(prev => ({ ...prev, swift_code: e.target.value }))}
                  placeholder="SWIFT/BIC"
                />
              </div>
              <div className="space-y-2">
                <Label>{locale === 'zh' ? '币种' : 'Currency'}</Label>
                <Input
                  value={newBankAccount.currency}
                  onChange={(e) => setNewBankAccount(prev => ({ ...prev, currency: e.target.value }))}
                  placeholder="USD"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={newBankAccount.is_default}
                onCheckedChange={(checked) => setNewBankAccount(prev => ({ ...prev, is_default: !!checked }))}
              />
              <Label htmlFor="is_default">{locale === 'zh' ? '设为默认账号' : 'Set as default account'}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBankDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddBankAccount} disabled={bankSaving || !newBankAccount.bank_name.trim() || !newBankAccount.account_number.trim()}>
              {bankSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Contact Confirmation Dialog */}
      <Dialog open={!!deleteContactId} onOpenChange={(open) => !open && setDeleteContactId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{locale === 'zh' ? '确认删除' : 'Confirm Delete'}</DialogTitle>
            <DialogDescription>
              {locale === 'zh' ? '确定要删除这个联系人吗？此操作无法撤销。' : 'Are you sure you want to delete this contact? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteContactId(null)} disabled={deleting}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteContact} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
