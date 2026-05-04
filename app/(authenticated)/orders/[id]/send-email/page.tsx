"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
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
  FileText,
  Edit3,
  Paperclip,
  X,
  Upload
} from "lucide-react"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { customerContactService } from "@/lib/pocketbase/services/customers"
import { soService, type FlatSO } from "@/lib/pocketbase/services/so"
import { appConfigService } from "@/lib/pocketbase/services/app-config"
import { ViewOrderDocumentButton } from "@/components/orders/view-order-document-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import type { BrandingConfig } from "@/lib/branding/types"

interface EmailFormData {
  to: string
  subject: string
  body: string
}

export default function OrderSendEmailPage() {
  const params = useParams()
  const router = useRouter()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems } = useBreadcrumb()
  
  const orderId = params.id as string
  
  const [orderCode, setOrderCode] = useState<string>("")
  const [order, setOrder] = useState<FlatSO | null>(null)
  const [customerInfo, setCustomerInfo] = useState<any>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("edit")
  const [branding, setBranding] = useState<BrandingConfig | null>(null)
  
  const [formData, setFormData] = useState<EmailFormData>({
    to: '',
    subject: '',
    body: '',
  })

  // Set breadcrumb
  useEffect(() => {
    setItems([
      { label: t("nav.orders"), href: "/orders" },
      { label: orderCode || orderId, href: `/orders/${orderId}` },
      { label: t("orders.sendEmail.title") }
    ])
  }, [orderId, orderCode, setItems, t])

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

  // Templates logic
  const generateTemplate = (data: { contactPerson: string, order: any }) => {
    const { contactPerson, order } = data
    const dateStr = formatDate(order.created)
    const amountStr = formatAmount(order.total_amount, order.currency)

    return `Dear ${contactPerson},

Please find attached the Proforma Invoice for order ${order.code}.

Order Details:
• Order No: ${order.code}
• Date: ${dateStr}
• Total Amount: ${amountStr}

If you have any questions, please don't hesitate to contact us.

Best regards,`
  }

  // Load order data and branding
  useEffect(() => {
    const loadOrderData = async () => {
      try {
        setIsLoading(true)
        
        // Load branding info
        try {
          const brandingData = await appConfigService.get('document_branding')
          if (brandingData) {
            setBranding(brandingData)
          }
        } catch (err) {
          console.error("Failed to load branding config:", err)
        }

        // Load order with expand from so collection
        const orderData = await soService.getOne(orderId, {
          expand: 'customer_id'
        })
        if (!orderData) {
          throw new Error('Order not found')
        }
        
        setOrder(orderData)
        setOrderCode(orderData.code || '')
        
        // Get customer info
        const customer = (orderData as any).expand?.customer_id
        if (customer) {
          setCustomerInfo(customer)
        }
        
        // Initialize email form
        if (orderData) {
          const customerToUse = customer || { id: orderData.customer_id, name: orderData.customer_name }
          let email = ''
          let contactPerson = getCustomerName(customerToUse)

          try {
            if (customerToUse.id) {
              const primaryContact = await customerContactService.getPrimaryContact(customerToUse.id)
              if (primaryContact) {
                email = primaryContact.email || ''
                contactPerson = primaryContact.name || getCustomerName(customerToUse)
              } else {
                const contacts = await customerContactService.getByCustomer(customerToUse.id)
                const contactWithEmail = contacts.find(c => c.email)
                if (contactWithEmail) {
                  email = contactWithEmail.email || ''
                  contactPerson = contactWithEmail.name || getCustomerName(customerToUse)
                }
              }
            }
          } catch (error) {
            console.error('Error fetching customer contacts:', error)
          }

          const initialBody = generateTemplate({ 
            contactPerson, 
            order: orderData
          })

          setFormData({
            to: email,
            subject: `Proforma Invoice - Order ${orderData.code}`,
            body: initialBody,
          })
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
  }, [orderId, t, toast, locale])

  const handleSend = async () => {
    if (!formData.to) {
      toast({
        title: t("common.error"),
        description: t("orders.sendEmail.errorNoRecipient"),
        variant: "destructive"
      })
      return
    }

    if (!attachment) {
      toast({
        title: locale === 'zh' ? '请上传附件' : 'Please upload an attachment',
        description: t("orders.sendEmail.selectPIRequired"),
        variant: "destructive"
      })
      return
    }

    setIsSending(true)

    try {
      // Browser-native base64 conversion using FileReader
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(attachment)
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1]) // Remove data URI prefix
        }
        reader.onerror = error => reject(error)
      })
      
      const response = await fetch(`/api/orders/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          to: formData.to,
          subject: formData.subject,
          body: formData.body,
          attachmentBase64: base64,
          attachmentName: attachment.name,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send email')

      toast({
        title: t("orders.sendEmail.sendSuccess"),
        description: t("orders.sendEmail.sendSuccessDesc"),
      })
      
      setTimeout(() => {
        router.push(`/orders/${orderId}`)
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

  // Branded Preview Component
  const EmailPreview = () => (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden flex flex-col h-full max-h-[700px]">
      <div className="bg-muted/30 p-4 border-bottom flex items-center justify-between">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/80" />
          <div className="w-3 h-3 rounded-full bg-amber-400/80" />
          <div className="w-3 h-3 rounded-full bg-green-400/80" />
        </div>
        <div className="text-xs text-muted-foreground font-medium">Email Preview</div>
        <div className="w-12" />
      </div>
      <div className="p-6 overflow-y-auto bg-white flex-1 font-sans text-[#333]">
        <div className="mb-6 pb-4 border-b border-gray-100 flex justify-between items-start">
          <div>
            <div className="text-xl font-semibold mb-1">{formData.subject || "(No Subject)"}</div>
            <div className="text-sm text-gray-500">To: <span className="text-blue-600">{formData.to || "(No Recipient)"}</span></div>
          </div>
          {attachment && (
            <Badge variant="secondary" className="gap-1 px-2 py-1">
              <Paperclip className="h-3 w-3" />
              {attachment.name}
            </Badge>
          )}
        </div>

        {/* Branded Template Mockup */}
        <div className="max-w-2xl mx-auto border border-gray-100 rounded-sm p-8 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]">
          <div className="mb-8 pb-4 border-b border-gray-100">
            {branding?.logo_url ? (
               <img src={branding.logo_url} alt="Logo" className="max-h-12 max-w-[200px] object-contain" />
            ) : (
              <div className="w-32 h-10 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400 uppercase tracking-widest italic">
                [Company Logo]
              </div>
            )}
          </div>
          
          <div className="whitespace-pre-wrap text-sm leading-relaxed mb-8">
            {formData.body}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-500 space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <div className="font-bold text-gray-900 mb-1">{branding?.default_signer?.name || "Your Account Manager"}</div>
                <div>{branding?.default_signer?.title || "Export Trade Department"}</div>
                <div className="mt-2 text-blue-600 font-medium">{branding?.website_url || "www.yourcompany.com"}</div>
              </div>
              <div className="w-20 h-6 bg-gray-50 rounded flex items-center justify-center text-[8px] opacity-50 uppercase">
                {branding?.company_name || "[Company Name]"}
              </div>
            </div>
            
            <div className="text-[10px] leading-tight opacity-60 italic pt-4">
              This message and its attachments may contain confidential information intended solely for the use of the addressee.
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading order details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shadow-sm"
            onClick={() => router.push(`/orders/${orderId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t("orders.sendEmail.title")}
            </h2>
            <div className="text-muted-foreground flex items-center gap-2 mt-1 text-sm">
              <Badge variant="outline" className="font-mono">{orderCode}</Badge>
              <span>{getCustomerName(customerInfo)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <ViewOrderDocumentButton
            order={order}
            docType="PI"
            variant="outline"
            label={t("orders.sendEmail.viewPIDirectory")}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5 h-full">
        {/* Left Column: Composer */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="shadow-md border-muted/60 overflow-hidden">
            <div className="h-1.5 bg-primary/80 w-full" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-primary" />
                    {t("orders.sendEmail.composeEmail")}
                  </CardTitle>
                  <CardDescription>
                    {t("orders.sendEmail.composeDescription")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="to" className="text-sm font-semibold">{t("orders.sendEmail.to")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="to"
                      type="email"
                      placeholder="customer@example.com"
                      className="pl-10"
                      value={formData.to}
                      onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="subject" className="text-sm font-semibold">{t("orders.sendEmail.subject")}</Label>
                  <Input
                    id="subject"
                    placeholder="Enter email subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-sm font-semibold">
                    {locale === 'zh' ? 'PI 附件' : 'PI Attachment'}
                  </Label>
                  {!attachment ? (
                    <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-muted/20 hover:bg-muted/30 transition-colors group relative overflow-hidden min-h-[160px]">
                      <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">Click or drag to upload PI document</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF or Excel (max 10MB)</p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.xls"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/5 border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px] md:max-w-md">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">{(attachment.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setAttachment(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="body" className="text-sm font-semibold">{t("orders.sendEmail.message")}</Label>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 opacity-60">Rich Text Previewed on Right</Badge>
                  </div>
                  <Textarea
                    id="body"
                    rows={12}
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    className="font-mono text-sm resize-none focus-visible:ring-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  className="px-6"
                  onClick={() => router.push(`/orders/${orderId}`)}
                  disabled={isSending}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  className="px-8 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                  onClick={handleSend}
                  disabled={isSending || !formData.to || !attachment}
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

        {/* Right Column: Preview */}
        <div className="lg:col-span-2 hidden lg:block h-full sticky top-6">
          <EmailPreview />
        </div>

        {/* Mobile Preview Trigger */}
        <div className="lg:hidden">
          <Tabs defaultValue="edit" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Edit Content</TabsTrigger>
              <TabsTrigger value="preview">Live Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="mt-4">
              <EmailPreview />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Visual Success Indicator Overlay */}
      {isSending && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-[300px] p-6 text-center space-y-4 shadow-2xl border-primary/20">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <div className="relative p-4 rounded-full bg-primary/10 text-primary">
                  <Mail className="h-10 w-10" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg">Sending Email...</h3>
              <p className="text-sm text-muted-foreground">Preparing your documents and connecting to mail server.</p>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-full animate-progress-indeterminate" />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
