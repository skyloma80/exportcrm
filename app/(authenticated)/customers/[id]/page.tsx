"use client"

/**
 * Customer Detail Page
 * 客户详情页
 * 
 * 显示客户完整信息、联系人列表、关联项目和订单
 */

import { useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useI18n } from "@/lib/i18n/use-i18n"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { customerContactService, CustomerContact } from "@/lib/pocketbase/services/customers"
import { ContactFormDialog } from "@/components/customers/contact-form-dialog"
import { useTabState } from "@/hooks/use-tab-state"
import { 
  Pencil, 
  Trash2, 
  Building2, 
  Loader2, 
  Star,
  Mail,
  Phone,
  User,
  Plus,
  FolderKanban,
  ShoppingCart,
  Wand2
} from "lucide-react"
import { ViewDiskButton } from "@/components/disk/view-disk-button"

interface PageProps {
  params: Promise<{ id: string }>
}

interface Customer {
  id: string
  code: string
  name: string
  name_cn?: string
  country: string
  type: string
  rating?: number
  preferred_currency?: string
  address?: string
  address_cn?: string
  website?: string
  remarks?: string
  tax_id?: string
  created: string
  updated: string
}

export default function CustomerDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { t, locale } = useI18n()
  const { setItems } = useBreadcrumb()
  const [activeTab, setActiveTab] = useTabState("info")

  // State
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [contacts, setContacts] = useState<CustomerContact[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Contact management state
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null)
  const [contactLoading, setContactLoading] = useState(false)

  // Load data
  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const pb = getPocketBase()
      
      // Load customer
      const customerData = await pb.collection("customers").getOne<Customer>(id)
      setCustomer(customerData)
      
      // Load contacts
      const contactsData = await pb.collection("customer_contacts").getList<CustomerContact>(1, 50, {
        filter: `customer = "${id}"`,
        sort: "-is_primary,name",
      })
      setContacts(contactsData.items || [])
      
      // Load projects
      const projectsData = await pb.collection("projects").getList(1, 50, {
        filter: `customer = "${id}"`,
        sort: "-created",
      })
      setProjects(projectsData.items || [])
    } catch (err: any) {
      console.error("Error loading data:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  // Set breadcrumb when customer loads
  useEffect(() => {
    if (customer) {
      setItems([
        { label: t("nav.customers"), href: "/customers" },
        { label: getDisplayName(customer) },
      ])
    }
    return () => setItems([])
  }, [customer, setItems, t])

  // Get display name based on locale
  const getDisplayName = (c: Customer) => {
    if (locale === 'zh' && c.name_cn) {
      return c.name_cn
    }
    return c.name
  }

  // Get display address based on locale
  const getDisplayAddress = (c: Customer) => {
    if (locale === 'zh' && c.address_cn) {
      return c.address_cn
    }
    return c.address
  }

  // Type badge variant
  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'direct': return 'default'
      case 'agent': return 'secondary'
      case 'distributor': return 'outline'
      default: return 'secondary'
    }
  }

  // Render rating stars
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

  // Handle delete
  const handleDelete = async () => {
    setDeleting(true)
    try {
      const pb = getPocketBase()
      await pb.collection("customers").delete(id)
      toast({
        title: t("common.success"),
        description: t("customers.deleteSuccess"),
      })
      router.push("/customers")
    } catch (error: any) {
      console.error("Failed to delete customer:", error)
      toast({
        title: t("common.error"),
        description: error.message || t("customers.deleteError"),
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  // Handle add contact
  const handleAddContact = () => {
    setEditingContact(null)
    setContactDialogOpen(true)
  }

  // Handle edit contact
  const handleEditContact = (contact: CustomerContact) => {
    setEditingContact(contact)
    setContactDialogOpen(true)
  }

  // Handle delete contact
  const handleDeleteContact = async (contact: CustomerContact) => {
    if (!confirm(t("customers.contacts.deleteConfirm"))) return
    
    try {
      await customerContactService.delete(contact.id)
      toast({
        title: t("common.success"),
        description: t("customers.contacts.deleteSuccess"),
      })
      loadData()
    } catch (error: any) {
      console.error("Failed to delete contact:", error)
      toast({
        title: t("common.error"),
        description: error.message || t("customers.contacts.deleteError"),
        variant: "destructive",
      })
    }
  }

  // Handle contact form submit
  const handleContactSubmit = async (data: {
    name: string
    position: string
    email: string
    phone: string
    wechat: string
    is_primary: boolean
  }) => {
    setContactLoading(true)
    try {
      if (editingContact) {
        // Update existing contact
        await customerContactService.update(editingContact.id, data)
        toast({
          title: t("common.success"),
          description: t("customers.contacts.updateSuccess"),
        })
      } else {
        // Create new contact
        await customerContactService.createContact(id, data)
        toast({
          title: t("common.success"),
          description: t("customers.contacts.createSuccess"),
        })
      }
      setContactDialogOpen(false)
      loadData()
    } catch (error: any) {
      console.error("Failed to save contact:", error)
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setContactLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    )
  }

  // Error or not found state
  if (error || !customer) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground/50" />
              <h2 className="mt-4 text-xl font-semibold">
                {t("customers.detail.notFound")}
              </h2>
              <p className="mt-2 text-muted-foreground text-center">
                {t("customers.detail.notFoundDescription")}
              </p>
              <Link href="/customers">
                <Button className="mt-4">{t("customers.detail.backToList")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Building2 className="h-10 w-10 text-muted-foreground mt-1" />
            <div>
              <h1 className="text-2xl font-bold">{getDisplayName(customer)}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-muted-foreground font-mono">
                  {customer.code}
                </span>
                <Badge variant={getTypeVariant(customer.type)}>
                  {t(`customers.type.${customer.type}`)}
                </Badge>
                {renderRating(customer.rating)}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <ViewDiskButton
              type="customer"
              name={customer.name}
              label={locale === 'zh' ? '文件' : 'Files'}
            />
            <Link href={`/customers/${customer.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                {t("common.edit")}
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("common.delete")}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">{t("customers.tabs.info")}</TabsTrigger>
          <TabsTrigger value="contacts">{t("customers.tabs.contacts")} ({contacts.length})</TabsTrigger>
          <TabsTrigger value="projects">{t("customers.tabs.projects")} ({projects.length})</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>{t("customers.detail.basicInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">{t("customers.form.name")}</div>
                    <div className="font-medium">{customer.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t("customers.form.nameCn")}</div>
                    <div className="font-medium">{customer.name_cn || "-"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">{t("customers.form.country")}</div>
                    <div className="font-medium">{customer.country || "-"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t("customers.form.currency")}</div>
                    <div className="font-medium font-mono">{customer.preferred_currency || "-"}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t("customers.form.taxId")}</div>
                  <div className="font-medium">{customer.tax_id || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t("customers.form.website")}</div>
                  {customer.website ? (
                    <a 
                      href={customer.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {customer.website}
                    </a>
                  ) : (
                    <div className="font-medium">-</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right Column - Address & Remarks */}
            <Card>
              <CardHeader>
                <CardTitle>{locale === 'zh' ? '地址与备注' : 'Address & Remarks'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">{t("customers.form.address")}</div>
                  <div className="font-medium whitespace-pre-wrap">{customer.address || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t("customers.form.addressCn")}</div>
                  <div className="font-medium whitespace-pre-wrap">{customer.address_cn || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t("customers.form.remarks")}</div>
                  <div className="font-medium whitespace-pre-wrap">{customer.remarks || "-"}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("customers.contacts.title")}</CardTitle>
                <CardDescription>{t("customers.contacts.description")}</CardDescription>
              </div>
              <Button size="sm" onClick={handleAddContact}>
                <Plus className="h-4 w-4 mr-2" />
                {t("customers.contacts.add")}
              </Button>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("customers.contacts.empty")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("customers.contacts.name")}</TableHead>
                      <TableHead>{t("customers.contacts.position")}</TableHead>
                      <TableHead>{t("customers.contacts.email")}</TableHead>
                      <TableHead>{t("customers.contacts.phone")}</TableHead>
                      <TableHead>{t("customers.contacts.wechat")}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{contact.name}</span>
                            {contact.is_primary && (
                              <Badge variant="secondary" className="text-xs">
                                {t("customers.contacts.primary")}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{contact.position || "-"}</TableCell>
                        <TableCell>
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-primary hover:underline flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {contact.phone ? (
                            <a href={`tel:${contact.phone}`} className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{contact.wechat || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditContact(contact)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteContact(contact)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("customers.projects.title")}</CardTitle>
                <CardDescription>{t("customers.projects.description")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => router.push(`/projects/new?customer=${id}`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("customers.projects.add")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("customers.projects.empty")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("projects.columns.code")}</TableHead>
                      <TableHead>{t("projects.columns.name")}</TableHead>
                      <TableHead>{t("projects.columns.stage")}</TableHead>
                      <TableHead>{t("projects.columns.probability")}</TableHead>
                      <TableHead>{t("common.created")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow 
                        key={project.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/projects/${project.id}`)}
                      >
                        <TableCell className="font-mono">{project.code}</TableCell>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{project.stage}</Badge>
                        </TableCell>
                        <TableCell>{project.probability ? `${project.probability}%` : '-'}</TableCell>
                        <TableCell>{new Date(project.created).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{t("customers.deleteConfirmTitle")}</CardTitle>
              <CardDescription>
                {t("customers.deleteConfirmDescription", { name: getDisplayName(customer) })}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("common.deleting")}
                  </>
                ) : (
                  t("common.delete")
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contact Form Dialog */}
      <ContactFormDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        initialData={editingContact || undefined}
        onSubmit={handleContactSubmit}
        isLoading={contactLoading}
      />
    </div>
  )
}
