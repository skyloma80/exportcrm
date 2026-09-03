"use client"

import { useState, useEffect, useCallback } from "react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SupplierSelect } from "@/components/ui/supplier-select"
import { Loader2, Plus, History, Trash2, DollarSign, Star, PackageOpen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Tier {
  minQty: number
  maxQty: number | null
  unitPrice: number
}

interface ProductCost {
  id: string
  product: string
  supplier: string
  currency: string
  moq?: number
  lead_time_days?: number
  tiers?: Tier[]
  is_preferred?: boolean
  valid_from: string
  valid_until?: string | null
  remarks?: string
  expand?: {
    product?: { id: string; code: string; name: string; name_cn?: string; unit: string }
    supplier?: { id: string; code: string; name: string; name_cn?: string }
  }
}

interface ProductCostManagerProps {
  productId: string
  productCode: string
}

export function ProductCostManager({ productId, productCode }: ProductCostManagerProps) {
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const [costs, setCosts] = useState<ProductCost[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProductCost | null>(null)
  const [historyTarget, setHistoryTarget] = useState<{ supplierId: string; supplierName: string } | null>(null)
  const [historyData, setHistoryData] = useState<ProductCost[]>([])

  // Form state
  const [formSupplier, setFormSupplier] = useState("")
  const [formCurrency, setFormCurrency] = useState("CNY")
  const [formMoq, setFormMoq] = useState(1)
  const [formLeadTime, setFormLeadTime] = useState(0)
  const [formTiers, setFormTiers] = useState<Tier[]>([{ minQty: 1, maxQty: null, unitPrice: 0 }])
  const [showTiers, setShowTiers] = useState(false)
  const [formPreferred, setFormPreferred] = useState(false)
  const [formRemarks, setFormRemarks] = useState("")
  const [saving, setSaving] = useState(false)

  const loadCosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/product-costs?product=${productId}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setCosts(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    loadCosts()
  }, [loadCosts])

  const resetForm = () => {
    setFormSupplier("")
    setFormCurrency("CNY")
    setFormMoq(1)
    setFormLeadTime(0)
    setFormTiers([{ minQty: 1, maxQty: null, unitPrice: 0 }])
    setShowTiers(false)
    setFormPreferred(false)
    setFormRemarks("")
  }

  const handleAdd = async () => {
    if (!formSupplier) return
    setSaving(true)
    try {
      const res = await fetch("/api/product-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: productId,
          supplier: formSupplier,
          currency: formCurrency,
          moq: formMoq,
          lead_time_days: formLeadTime || undefined,
          tiers: formTiers.filter((t) => t.unitPrice > 0),
          is_preferred: formPreferred,
          remarks: formRemarks || undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast({ title: t("common.success") })
      setAddOpen(false)
      resetForm()
      await loadCosts()
    } catch (e: any) {
      toast({ title: t("common.error"), description: String(e), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editTarget) return
    setSaving(true)
    try {
      const res = await fetch("/api/product-costs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          currency: formCurrency,
          moq: formMoq,
          lead_time_days: formLeadTime || undefined,
          tiers: formTiers.filter((t) => t.unitPrice > 0),
          is_preferred: formPreferred,
          remarks: formRemarks || undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast({ title: t("common.success") })
      setEditTarget(null)
      resetForm()
      await loadCosts()
    } catch (e: any) {
      toast({ title: t("common.error"), description: String(e), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("common.confirm"))) return
    try {
      const res = await fetch(`/api/product-costs?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast({ title: t("common.success") })
      await loadCosts()
    } catch (e: any) {
      toast({ title: t("common.error"), description: String(e), variant: "destructive" })
    }
  }

  const handleDeleteHistory = async (id: string) => {
    if (!confirm(t("common.confirm"))) return
    try {
      const res = await fetch(`/api/product-costs?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast({ title: t("common.success") })
      // Refresh history data
      if (historyTarget) {
        const historyRes = await fetch(`/api/product-costs?product=${productId}&supplier=${historyTarget.supplierId}&history=true`)
        if (historyRes.ok) {
          setHistoryData(await historyRes.json())
        }
      }
    } catch (e: any) {
      toast({ title: t("common.error"), description: String(e), variant: "destructive" })
    }
  }

  const openEdit = (cost: ProductCost) => {
    setEditTarget(cost)
    setFormCurrency(cost.currency)
    setFormMoq(cost.moq || 1)
    setFormLeadTime(cost.lead_time_days || 0)
    // Filter out empty tiers (unitPrice <= 0) to avoid showing garbage rows
    const validTiers = (cost.tiers || []).filter((t) => t && t.unitPrice > 0)
    setFormTiers(validTiers.length > 0 ? validTiers : [{ minQty: 1, maxQty: null, unitPrice: 0 }])
    setFormPreferred(cost.is_preferred || false)
    setShowTiers(validTiers.length > 1)
    setFormRemarks(cost.remarks || "")
  }

  const openHistory = async (supplierId: string, supplierName: string) => {
    setHistoryTarget({ supplierId, supplierName })
    try {
      const res = await fetch(`/api/product-costs?product=${productId}&supplier=${supplierId}&history=true`)
      if (!res.ok) throw new Error("Failed to load history")
      const data = await res.json()
      setHistoryData(data)
    } catch (e) {
      console.error(e)
    }
  }

  const addTier = () => {
    const last = formTiers[formTiers.length - 1]
    const nextMin = last ? (last.maxQty || last.minQty) + 1 : 1
    setFormTiers([...formTiers, { minQty: nextMin, maxQty: null, unitPrice: 0 }])
  }

  const updateTier = (index: number, field: keyof Tier, value: number | null) => {
    const updated = [...formTiers]
    ;(updated[index] as any)[field] = value
    if (field === "minQty" && index > 0) {
      const prev = updated[index - 1]
      if (prev) prev.maxQty = value ? value - 1 : null
    }
    setFormTiers(updated)
  }

  const removeTier = (index: number) => {
    if (formTiers.length <= 1) return
    setFormTiers(formTiers.filter((_, i) => i !== index))
  }

  const currencySymbol = (c?: string) => {
    if (c === "CNY") return "¥"
    if (c === "EUR") return "€"
    return "$"
  }

  const getSupplierName = (cost: ProductCost) => {
    const s = cost.expand?.supplier
    if (!s) return cost.supplier
    return locale === "zh" && s.name_cn ? s.name_cn : s.name
  }

  const formatTiers = (tiers?: Tier[], currency?: string) => {
    if (!tiers || tiers.length === 0) return "-"
    const active = tiers.filter((t) => t.unitPrice > 0)
    if (active.length === 0) return "-"
    const sym = currencySymbol(currency)
    if (active.length === 1 && active[0].minQty <= 1) return `${sym}${active[0].unitPrice.toFixed(2)}`
    return active.map((t) => `${t.minQty}+ = ${sym}${t.unitPrice.toFixed(2)}`).join(", ")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("products.costs.title")}</h3>
        <Dialog
          open={addOpen}
          onOpenChange={(open) => {
            if (open) resetForm()
            setAddOpen(open)
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("products.costs.add")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("products.costs.addCost")}</DialogTitle>
            </DialogHeader>
            <CostForm
              supplier={formSupplier}
              onSupplierChange={setFormSupplier}
              currency={formCurrency}
              onCurrencyChange={setFormCurrency}
              moq={formMoq}
              onMoqChange={setFormMoq}
              leadTime={formLeadTime}
              onLeadTimeChange={setFormLeadTime}
              tiers={formTiers}
              onTiersChange={setFormTiers}
              onAddTier={addTier}
              onUpdateTier={updateTier}
              onRemoveTier={removeTier}
              showTiers={showTiers}
              onToggleTiers={() => {
                if (showTiers) {
                  setFormTiers([{ minQty: 1, maxQty: null, unitPrice: formTiers[0]?.unitPrice || 0 }])
                }
                setShowTiers(!showTiers)
              }}
              preferred={formPreferred}
              onPreferredChange={setFormPreferred}
              remarks={formRemarks}
              onRemarksChange={setFormRemarks}
              saving={saving}
              onSave={handleAdd}
              t={t}
              locale={locale}
            />
          </DialogContent>
        </Dialog>
      </div>

      {costs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PackageOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t("products.costs.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("products.costs.supplier")}</TableHead>
                  <TableHead>{t("products.costs.unitPrice")}</TableHead>
                  <TableHead className="text-right">{t("products.costs.moq")}</TableHead>
                  <TableHead className="text-right">{t("products.costs.leadTime")}</TableHead>
                  <TableHead className="text-center">{t("products.costs.preferred")}</TableHead>
                  <TableHead className="text-center">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell className="font-medium">{getSupplierName(cost)}</TableCell>
                    <TableCell className="max-w-xs truncate">{formatTiers(cost.tiers, cost.currency)}</TableCell>
                    <TableCell className="text-right">{cost.moq || "-"}</TableCell>
                    <TableCell className="text-right">
                      {cost.lead_time_days ? `${cost.lead_time_days}d` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {cost.is_preferred ? (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mx-auto" />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openHistory(cost.supplier, getSupplierName(cost))}
                          className="text-blue-600 underline hover:text-blue-800"
                        >
                          {t("products.costs.history")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(cost)}
                          className="text-blue-600 underline hover:text-blue-800"
                        >
                          {t("common.edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cost.id)}
                          className="text-destructive"
                        >
                          {t("common.delete")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("products.costs.editCost")} - {editTarget ? getSupplierName(editTarget) : ""}
            </DialogTitle>
          </DialogHeader>
          {editTarget && (
            <CostForm
              supplier={editTarget.supplier}
              onSupplierChange={() => {}}
              currency={formCurrency}
              onCurrencyChange={setFormCurrency}
              moq={formMoq}
              onMoqChange={setFormMoq}
              leadTime={formLeadTime}
              onLeadTimeChange={setFormLeadTime}
              tiers={formTiers}
              onTiersChange={setFormTiers}
              onAddTier={addTier}
              onUpdateTier={updateTier}
              onRemoveTier={removeTier}
              showTiers={showTiers}
              onToggleTiers={() => {
                if (showTiers) {
                  setFormTiers([{ minQty: 1, maxQty: null, unitPrice: formTiers[0]?.unitPrice || 0 }])
                }
                setShowTiers(!showTiers)
              }}
              preferred={formPreferred}
              onPreferredChange={setFormPreferred}
              remarks={formRemarks}
              onRemarksChange={setFormRemarks}
              saving={saving}
              onSave={handleEdit}
              t={t}
              locale={locale}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={!!historyTarget}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryTarget(null)
            setHistoryData([])
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("products.costs.priceHistory")} - {historyTarget?.supplierName || ""}
            </DialogTitle>
          </DialogHeader>
          {historyData.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">{t("common.noData")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("products.costs.validFrom")}</TableHead>
                  <TableHead>{t("products.costs.validUntil")}</TableHead>
                  <TableHead>{t("products.costs.unitPrice")}</TableHead>
                  <TableHead className="text-right">{t("products.costs.moq")}</TableHead>
                  <TableHead className="text-center">{t("products.costs.preferred")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{new Date(h.valid_from).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {h.valid_until ? new Date(h.valid_until).toLocaleDateString() : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {t("products.costs.active")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{formatTiers(h.tiers, h.currency)}</TableCell>
                    <TableCell className="text-right">{h.moq || "-"}</TableCell>
                    <TableCell className="text-center">
                      {h.is_preferred ? (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mx-auto" />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// Cost Form Sub-component
// ============================================================================

interface CostFormProps {
  supplier: string
  onSupplierChange: (v: string) => void
  currency: string
  onCurrencyChange: (v: string) => void
  moq: number
  onMoqChange: (v: number) => void
  leadTime: number
  onLeadTimeChange: (v: number) => void
  tiers: Tier[]
  onTiersChange: (tiers: Tier[]) => void
  onAddTier: () => void
  onUpdateTier: (idx: number, field: keyof Tier, value: number | null) => void
  onRemoveTier: (idx: number) => void
  showTiers: boolean
  onToggleTiers: () => void
  preferred: boolean
  onPreferredChange: (v: boolean) => void
  remarks: string
  onRemarksChange: (v: string) => void
  saving: boolean
  onSave: () => void
  t: any
  locale: string
  isEdit?: boolean
}

function CostForm({
  supplier,
  onSupplierChange,
  currency,
  onCurrencyChange,
  moq,
  onMoqChange,
  leadTime,
  onLeadTimeChange,
  tiers,
  onUpdateTier,
  onAddTier,
  onRemoveTier,
  showTiers,
  onToggleTiers,
  preferred,
  onPreferredChange,
  remarks,
  onRemarksChange,
  saving,
  onSave,
  t,
  locale: _locale,
  isEdit,
}: CostFormProps) {
  return (
    <div className="space-y-4 pt-4">
      {!isEdit && (
        <div>
          <label className="text-sm font-medium mb-1 block">{t("products.costs.supplier")}</label>
          <SupplierSelect value={supplier} onChange={(s) => onSupplierChange(s?.id || "")} />
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">{t("products.costs.currency")}</label>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
          >
            <option value="USD">USD</option>
            <option value="CNY">CNY</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">{t("products.costs.moq")}</label>
          <Input
            type="number"
            min={0}
            value={moq}
            onChange={(e) => onMoqChange(parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">{t("products.costs.leadTime")}</label>
          <Input
            type="number"
            min={0}
            value={leadTime}
            onChange={(e) => onLeadTimeChange(parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      {showTiers ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">{t("products.costs.tiers")}</label>
            <div className="flex gap-1">
              <Button type="button" variant="outline" size="sm" onClick={onAddTier}>
                <Plus className="h-3 w-3 mr-1" /> {t("products.costs.addTier")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onToggleTiers}>
                {_locale === "zh" ? "改为简单定价" : "Simple pricing"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {tiers.map((tier, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={t("products.costs.minQty")}
                  value={tier.minQty}
                  onChange={(e) => onUpdateTier(idx, "minQty", parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-muted-foreground">~</span>
                <Input
                  type="number"
                  placeholder={t("products.costs.maxQty")}
                  value={tier.maxQty ?? ""}
                  onChange={(e) => onUpdateTier(idx, "maxQty", e.target.value ? parseInt(e.target.value) : null)}
                  className="w-24"
                />
                <span className="text-muted-foreground">:</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t("products.costs.unitPrice")}
                  value={tier.unitPrice}
                  onChange={(e) => onUpdateTier(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                  className="w-28"
                />
                {tiers.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => onRemoveTier(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">{t("products.costs.unitPrice")}</label>
            <Button type="button" variant="ghost" size="sm" onClick={onToggleTiers}>
              {_locale === "zh" ? "阶梯定价" : "Tiered pricing"}
            </Button>
          </div>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={tiers[0]?.unitPrice || 0}
            onChange={(e) => onUpdateTier(0, "unitPrice", parseFloat(e.target.value) || 0)}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="preferred"
          checked={preferred}
          onChange={(e) => onPreferredChange(e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="preferred" className="text-sm">
          {t("products.costs.markPreferred")}
        </label>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">{t("products.costs.remarks")}</label>
        <Input
          value={remarks}
          onChange={(e) => onRemarksChange(e.target.value)}
          placeholder={t("products.costs.remarksPlaceholder")}
        />
      </div>

      <Button onClick={onSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isEdit ? t("products.costs.updatePrice") : t("products.costs.save")}
      </Button>
    </div>
  )
}
