"use client"

/**
 * Order Send Email Page
 * 订单发送邮件页面
 * 
 * Send PI document to customer via email
 */

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Mail, 
  Loader2, 
  ArrowLeft,
  Send,
  Paperclip,
  FileText,
  AlertCircle
} from "lucide-react"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { customerContactService } from "@/lib/pocketbase/services/customers"
import { orderService } from "@/lib/pocketbase/services/orders"
import { projectService } from "@/lib/pocketbase/services/projects"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ViewOrderDocumentButton } from "@/components/orders/view-order-document-button"
import type { OrderWithExpand } from "@/lib/pocketbase/services/orders"

interface EmailFormData {
  to: string
  subject: string
  body: string
  selectedPI: string
}

interface PIDocument {
  name: string
  path: string
  size?: number
  created?: string
}

export default function OrderSendEmailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems } = useBreadcrumb()
  
  const orderId = params.id as string
  const projectId = searchParams.get('project')
  
  const [orderCode, setOrderCode] = useState<string>("")
  const [order, setOrder] = useState<OrderWithExpand | null>(null)
  const [customerInfo, setCustomerInfo] = useState<any>(null)
  const [projectInfo, setProjectInfo] = useState<any>(null)
  const [piDocuments, setPiDocuments] = useState<PIDocument[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingPIs, setIsLoadingPIs] = useState(false)
  
  const [formData, setFormData] = useState<EmailFormData>({
    to: '',
    subject: '',
    body: '',
    selectedPI: '',
  })

  // Set breadcrumb
  useEffect(() => {
    setItems([
      { label: t("nav.orders"), href: "/orders" },
      { label: orderCode || orderId, href: `/orders/${orderId}${projectId ? `?project=${projectId}` : ''}` },
      { label: t("orders.sendEmail.title") }
    ])
  }, [orderId, orderCode, projectId, setItems, t])

  // Format date
  const formatDate = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Format amount
  const formatAmount = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  // Get customer display name
  const getCustomerName = (customer: any) => {
    if (!customer) return ''
    return locale === 'zh' && customer.name_cn ? customer.name_cn : customer.name
  }

  // Load order data
  useEffect(() => {
    const loadOrderData = async () => {
      try {
        setIsLoading(true)
        
        // Load order with expand
        const orderData = await orderService.getWithDetails(orderId)
        if (!orderData) {
          throw new Error('Order not found')
        }
        
        setOrder(orderData)
        setOrderCode(orderData.code)
        
        // Get customer info
        const customer = orderData.expand?.customer
        if (customer) {
          setCustomerInfo(customer)
        }
        
        // Get project info
        let project = orderData.expand?.project
        if (!project && projectId) {
          project = await projectService.getOne(projectId)
        }
        if (project) {
          setProjectInfo(project)
        }
        
        // Load PI documents
        if (customer && orderData) {
          await loadPIDocuments(orderData, customer, project)
        }
        
        // Initialize email form
        if (customer && orderData) {
          await initEmailForm(orderData, customer, project, '')
        }
      } catch (error) {
        console.error("Error loading order data:", error)
        toast({
          title: t("common.error"),
          description: t("orders.sendEmail.loadError"),
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadOrderData()
  }, [orderId, projectId, t, toast, locale])

  // Load PI documents
  const loadPIDocuments = async (orderData: any, customer: any, project: any) => {
    try {
      setIsLoadingPIs(true)
      
      // Load PI documents via API
      try {
        const response = await fetch(`/api/orders/${orderData.id}/pi-documents`)
        
        if (!response.ok) {
          throw new Error('Failed to load PI documents')
        }
        
        const data = await response.json()
        const piFiles = data.files || []
        
        setPiDocuments(piFiles)
        
        // Auto-select the first (latest) PI
        if (piFiles.length > 0) {
          setFormData(prev => ({ ...prev, selectedPI: piFiles[0].path }))
        }
      } catch (error) {
        console.error("Error loading PI files:", error)
        // If directory doesn't exist or is empty, just set empty array
        setPiDocuments([])
      }
    } catch (error) {
      console.error("Error loading PI documents:", error)
    } finally {
      setIsLoadingPIs(false)
    }
  }

  // Initialize email form
  const initEmailForm = async (order: any, customer: any, project: any, selectedPI: string) => {
    let email = ''
    let contactPerson = getCustomerName(customer)

    // Try to get primary contact email
    try {
      const primaryContact = await customerContactService.getPrimaryContact(customer.id)
      if (primaryContact) {
        email = primaryContact.email || ''
        contactPerson = primaryContact.name || getCustomerName(customer)
      } else {
        // If no primary contact, try to get first contact with email
        const contacts = await customerContactService.getByCustomer(customer.id)
        const contactWithEmail = contacts.find(c => c.email)
        if (contactWithEmail) {
          email = contactWithEmail.email || ''
          contactPerson = contactWithEmail.name || getCustomerName(customer)
        }
      }
    } catch (error) {
      console.error('Error fetching customer contacts:', error)
    }

    // Generate email content with customer name
    const projectName = locale === 'zh' && project?.name_cn ? project.name_cn : project?.name
    const emailBody = `Dear ${contactPerson},

Please find attached the Proforma Invoice for order ${order.code}.

Order Details:
• Order No: ${order.code}
• Date: ${formatDate(order.created)}
• Total Amount: ${formatAmount(order.total_amount, order.currency)}
${projectName ? `• Project: ${projectName}` : ''}

If you have any questions, please don't hesitate to contact us.

Best regards`

    setFormData(prev => ({
      ...prev,
      to: email,
      subject: `Proforma Invoice - Order ${order.code}${projectName ? ` - ${projectName}` : ''}`,
      body: emailBody,
    }))
  }

  // Handle PI selection change
  const handlePIChange = (value: string) => {
    setFormData(prev => ({ ...prev, selectedPI: value }))
  }

  const handleSend = async () => {
    // Validation
    if (!formData.to) {
      toast({
        title: t("common.error"),
        description: t("orders.sendEmail.errorNoRecipient"),
        variant: "destructive"
      })
      return
    }

    if (!formData.selectedPI) {
      toast({
        title: t("orders.sendEmail.validationError"),
        description: t("orders.sendEmail.selectPIRequired"),
        variant: "destructive"
      })
      return
    }

    if (!formData.subject || !formData.body) {
      toast({
        title: t("orders.sendEmail.validationError"),
        description: t("orders.sendEmail.subjectBodyRequired"),
        variant: "destructive"
      })
      return
    }

    setIsSending(true)

    try {
      const response = await fetch(`/api/orders/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          to: formData.to,
          subject: formData.subject,
          body: formData.body,
          piPath: formData.selectedPI,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      toast({
        title: t("orders.sendEmail.sendSuccess"),
        description: t("orders.sendEmail.sendSuccessDesc"),
      })
      
      setTimeout(() => {
        router.push(`/orders/${orderId}${projectId ? `?project=${projectId}` : ''}`)
      }, 1500)
    } catch (error: any) {
      console.error('Send email error:', error)
      toast({
        title: t("common.error"),
        description: error.message || t("orders.sendEmail.sendError"),
        variant: "destructive"
      })
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const selectedPIDoc = piDocuments.find(doc => doc.path === formData.selectedPI)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/orders/${orderId}${projectId ? `?project=${projectId}` : ''}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t("orders.sendEmail.title")}</h2>
            <p className="text-muted-foreground">
              {t("orders.sendEmail.description", { code: orderCode })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {/* PI Document Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t("orders.sendEmail.selectPI")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t("orders.sendEmail.selectPIDescription")}
                </CardDescription>
              </div>
              <ViewOrderDocumentButton
                order={order}
                docType="PI"
                label={t("orders.sendEmail.viewPIDirectory")}
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPIs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {t("orders.sendEmail.loadingPIs")}
                </span>
              </div>
            ) : piDocuments.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("orders.sendEmail.noPIsFound")}
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {t("orders.sendEmail.noPIsFoundDesc")}
                  </span>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                <Select value={formData.selectedPI} onValueChange={handlePIChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("orders.sendEmail.selectPIPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {piDocuments.map((doc) => (
                      <SelectItem key={doc.path} value={doc.path}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{doc.name}</span>
                          {doc.size && (
                            <span className="text-xs text-muted-foreground">
                              ({(doc.size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedPIDoc && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Paperclip className="h-4 w-4" />
                      <span>
                        {t("orders.sendEmail.attachmentNote", { filename: selectedPIDoc.name })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Composer */}
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.sendEmail.composeEmail")}</CardTitle>
            <CardDescription>
              {t("orders.sendEmail.composeDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to">{t("orders.sendEmail.to")}</Label>
              <Input
                id="to"
                type="email"
                value={formData.to}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">{t("orders.sendEmail.subject")}</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">{t("orders.sendEmail.message")}</Label>
              <Textarea
                id="body"
                rows={12}
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/orders/${orderId}${projectId ? `?project=${projectId}` : ''}`)}
                disabled={isSending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || !formData.to || !formData.selectedPI}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("orders.sendEmail.sending")}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t("orders.sendEmail.send")}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
