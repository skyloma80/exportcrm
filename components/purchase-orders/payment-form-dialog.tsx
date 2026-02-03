"use client"

/**
 * Payment Form Dialog
 * 采购订单付款记录表单对话框
 * 
 * 支持上传付款凭证到磁盘目录
 * 目录结构: Customers/{客户名}/{项目名}/{订单号}/purchase_orders/{采购单号}/{payment_type}/{filename}
 */

import { useState } from "react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, FileText } from "lucide-react"

const PAYMENT_METHODS = [
  'bank_transfer',
  'letter_of_credit',
  'paypal',
  'pingpong',
  'wise',
  'alipay',
  'wechat_pay',
  'payoneer',
  'western_union',
  'other',
] as const

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: '银行转账 / Bank Transfer',
  letter_of_credit: '信用证 / Letter of Credit',
  paypal: 'PayPal',
  pingpong: 'PingPong',
  wise: 'Wise (TransferWise)',
  alipay: '支付宝 / Alipay',
  wechat_pay: '微信支付 / WeChat Pay',
  payoneer: 'Payoneer (派安盈)',
  western_union: '西联汇款 / Western Union',
  other: '其他 / Other',
}

interface PaymentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseOrderId: string
  defaultCurrency?: string
  onSuccess?: () => void
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  purchaseOrderId,
  defaultCurrency = "USD",
  onSuccess,
}: PaymentFormDialogProps) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    type: "deposit",
    amount: "",
    currency: defaultCurrency,
    payment_method: "bank_transfer",
    payment_date: new Date().toISOString().split("T")[0],
    bank_reference: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const resetForm = () => {
    setFormData({
      type: "deposit",
      amount: "",
      currency: defaultCurrency,
      payment_method: "bank_transfer",
      payment_date: new Date().toISOString().split("T")[0],
      bank_reference: "",
    })
    setSelectedFile(null)
    setErrors({})
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 验证文件类型（图片或 PDF）
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
      if (!validTypes.includes(file.type)) {
        toast({
          title: t("common.error"),
          description: t("common.invalidFileType"),
          variant: "destructive",
        })
        return
      }
      
      // 验证文件大小（最大 10MB）
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t("common.error"),
          description: t("common.fileTooLarge"),
          variant: "destructive",
        })
        return
      }
      
      setSelectedFile(file)
      setErrors(prev => ({ ...prev, file: "" }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = t("validation.required")
    }
    
    if (!formData.payment_date) {
      newErrors.payment_date = t("validation.required")
    }
    
    if (!selectedFile) {
      newErrors.file = t("purchaseOrders.payments.fileRequired")
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      // 1. 创建付款记录
      const paymentData = {
        purchase_order: purchaseOrderId,
        type: formData.type,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        payment_method: formData.payment_method || "",
        payment_date: formData.payment_date,
        bank_reference: formData.bank_reference || "",
      }

      const response = await fetch(`/api/purchase-orders/${purchaseOrderId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create payment")
      }

      const payment = await response.json()

      // 2. 上传付款凭证文件
      const uploadFormData = new FormData()
      uploadFormData.append("file", selectedFile!)
      uploadFormData.append("payment_type", formData.type)
      uploadFormData.append("payment_id", payment.id)

      const uploadResponse = await fetch(
        `/api/purchase-orders/${purchaseOrderId}/payment-receipts`,
        {
          method: "POST",
          body: uploadFormData,
        }
      )

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.error || "Failed to upload receipt")
      }

      toast({
        title: t("common.success"),
        description: t("purchaseOrders.payments.created"),
      })

      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("Error creating payment:", error)
      toast({
        title: t("common.error"),
        description: error.message || t("common.unknownError"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("purchaseOrders.payments.add")}</DialogTitle>
          <DialogDescription>
            {t("purchaseOrders.payments.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Payment Type */}
              <div className="space-y-2">
                <Label htmlFor="type">{t("purchaseOrders.payments.type")} *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">
                      {t("purchaseOrders.paymentType.deposit")}
                    </SelectItem>
                    <SelectItem value="progress">
                      {t("purchaseOrders.paymentType.progress")}
                    </SelectItem>
                    <SelectItem value="final">
                      {t("purchaseOrders.paymentType.final")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">{t("purchaseOrders.payments.currency")} *</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">{t("purchaseOrders.payments.amount")} *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className={errors.amount ? "border-destructive" : ""}
                />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
              </div>

              {/* Payment Date */}
              <div className="space-y-2">
                <Label htmlFor="payment_date">{t("purchaseOrders.payments.date")} *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                  className={errors.payment_date ? "border-destructive" : ""}
                />
                {errors.payment_date && <p className="text-sm text-destructive">{errors.payment_date}</p>}
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="payment_method">{t("purchaseOrders.payments.method")}</Label>
              <Select 
                value={formData.payment_method} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, payment_method: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bank Reference */}
            <div className="space-y-2">
              <Label htmlFor="bank_reference">{t("purchaseOrders.payments.reference")}</Label>
              <Input
                id="bank_reference"
                value={formData.bank_reference}
                onChange={(e) => setFormData(prev => ({ ...prev, bank_reference: e.target.value }))}
                placeholder={t("purchaseOrders.payments.referencePlaceholder")}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file" className="text-red-500">
                {t("purchaseOrders.payments.receipt")} *
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileChange}
                  className={`flex-1 ${errors.file ? "border-destructive" : ""}`}
                />
                {selectedFile && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <FileText className="h-4 w-4" />
                    <span className="truncate max-w-[100px]">{selectedFile.name}</span>
                  </div>
                )}
              </div>
              {errors.file && <p className="text-sm text-destructive">{errors.file}</p>}
              <p className="text-xs text-muted-foreground">
                {t("purchaseOrders.payments.receiptHint")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
