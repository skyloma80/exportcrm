"use client"

/**
 * 付款条款选择组件
 * 
 * 带搜索功能的下拉选择框，支持中英文显示
 * 支持从预设列表选择或自定义输入
 */

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useI18n } from "@/lib/i18n/use-i18n"
import { appConfigService, DEFAULT_CONFIGS } from "@/lib/pocketbase/services/app-config"

interface PaymentTerm {
  code: string
  name: string
  name_cn?: string
}

interface PaymentTermsSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  allowCustom?: boolean
}

export function PaymentTermsSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  allowCustom = true,
}: PaymentTermsSelectProps) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [terms, setTerms] = useState<PaymentTerm[]>([])
  const [loading, setLoading] = useState(false)
  const [customInput, setCustomInput] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  useEffect(() => {
    loadTerms()
  }, [])

  const loadTerms = async () => {
    setLoading(true)
    try {
      const data = await appConfigService.get<PaymentTerm[]>('payment_terms')
      setTerms(data || DEFAULT_CONFIGS.payment_terms.value)
    } catch (error) {
      console.error("Error loading payment terms:", error)
      setTerms(DEFAULT_CONFIGS.payment_terms.value)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = (term: PaymentTerm) => {
    if (locale === "zh" && term.name_cn) return term.name_cn
    return term.name
  }

  const selectedTerm = terms.find((t) => t.code === value || t.name === value)
  
  // 判断当前值是否是自定义值（不在预设列表中）
  const isCustomValue = value && !selectedTerm

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      onChange(customInput.trim())
      setCustomInput("")
      setShowCustomInput(false)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          {selectedTerm ? (
            <span className="truncate">{getDisplayName(selectedTerm)}</span>
          ) : value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">
              {placeholder || (locale === 'zh' ? '选择付款条款' : 'Select payment terms')}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("common.search") || "Search..."} />
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <CommandEmpty>
                <div className="py-2 text-center text-sm text-muted-foreground">
                  {t("common.noData")}
                </div>
              </CommandEmpty>
              <CommandGroup className="max-h-48 overflow-auto">
                {terms.map((term) => (
                  <CommandItem
                    key={term.code}
                    value={`${term.name} ${term.name_cn || ""} ${term.code}`}
                    onSelect={() => {
                      onChange(term.code === value ? "" : term.code)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === term.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{getDisplayName(term)}</span>
                        <span className="text-xs text-muted-foreground font-mono">{term.code}</span>
                      </div>
                      {locale === 'zh' && term.name && (
                        <p className="text-xs text-muted-foreground truncate">{term.name}</p>
                      )}
                      {locale !== 'zh' && term.name_cn && (
                        <p className="text-xs text-muted-foreground truncate">{term.name_cn}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              
              {/* 自定义输入区域 */}
              {allowCustom && (
                <>
                  <CommandSeparator />
                  <div className="p-2">
                    {showCustomInput ? (
                      <div className="flex gap-2">
                        <Input
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          placeholder={locale === 'zh' ? '输入自定义条款...' : 'Enter custom terms...'}
                          className="h-8 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleCustomSubmit()
                            }
                            if (e.key === 'Escape') {
                              setShowCustomInput(false)
                              setCustomInput("")
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={handleCustomSubmit}
                          disabled={!customInput.trim()}
                        >
                          {locale === 'zh' ? '确定' : 'OK'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => setShowCustomInput(true)}
                      >
                        {locale === 'zh' ? '+ 输入自定义付款条款' : '+ Enter custom payment terms'}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
