"use client"

/**
 * 港口选择组件
 * 
 * 带搜索功能的下拉选择框，支持中英文显示
 * type: 'loading' 装货港（国内港口）, 'destination' 目的港（国外港口）
 */

import { useState, useEffect, useMemo } from "react"
import { Check, ChevronsUpDown, Loader2, Anchor } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useI18n } from "@/lib/i18n/use-i18n"
import { portsOfLoadingService } from "@/lib/pocketbase/services/ports-of-loading"
import { portsOfDestinationService } from "@/lib/pocketbase/services/ports-of-destination"

interface Port {
  code: string
  name: string
  name_cn?: string
}

// 默认目的港（国外港口）
const DEFAULT_DESTINATION_PORTS: Port[] = [
  { code: 'USNYC', name: 'New York', name_cn: '纽约' },
  { code: 'USLAX', name: 'Los Angeles', name_cn: '洛杉矶' },
  { code: 'USLGB', name: 'Long Beach', name_cn: '长滩' },
  { code: 'GBFXT', name: 'Felixstowe', name_cn: '费利克斯托' },
  { code: 'GBSOU', name: 'Southampton', name_cn: '南安普顿' },
  { code: 'DEHAM', name: 'Hamburg', name_cn: '汉堡' },
  { code: 'NLRTM', name: 'Rotterdam', name_cn: '鹿特丹' },
  { code: 'BEANR', name: 'Antwerp', name_cn: '安特卫普' },
  { code: 'FRLEH', name: 'Le Havre', name_cn: '勒阿弗尔' },
  { code: 'ITGOA', name: 'Genoa', name_cn: '热那亚' },
  { code: 'ESBCN', name: 'Barcelona', name_cn: '巴塞罗那' },
  { code: 'JPYOK', name: 'Yokohama', name_cn: '横滨' },
  { code: 'JPTYO', name: 'Tokyo', name_cn: '东京' },
  { code: 'KRPUS', name: 'Busan', name_cn: '釜山' },
  { code: 'SGSIN', name: 'Singapore', name_cn: '新加坡' },
  { code: 'AEJEA', name: 'Jebel Ali', name_cn: '杰贝阿里' },
  { code: 'AUSYD', name: 'Sydney', name_cn: '悉尼' },
  { code: 'AUMEL', name: 'Melbourne', name_cn: '墨尔本' },
]

interface PortSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  type?: 'loading' | 'destination'
}

export function PortSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  type = 'loading',
}: PortSelectProps) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [ports, setPorts] = useState<Port[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPorts()
  }, [type])

  const loadPorts = async () => {
    setLoading(true)
    try {
      if (type === 'destination') {
        const data = await portsOfDestinationService.getActive()
        setPorts(data && data.length > 0 ? data : DEFAULT_DESTINATION_PORTS)
      } else {
        const data = await portsOfLoadingService.getActive()
        setPorts(data && data.length > 0 ? data : DEFAULT_DESTINATION_PORTS)
      }
    } catch (error: any) {
      // 404 = collection doesn't exist, silently fall back to defaults
      if (error?.status !== 404) {
        console.error("Error loading ports:", error)
      }
      setPorts(type === 'destination' ? DEFAULT_DESTINATION_PORTS : DEFAULT_DESTINATION_PORTS)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = (port: Port) => {
    if (locale === "zh" && port.name_cn) return port.name_cn
    return port.name
  }

  const uniquePorts = useMemo(() => {
    const seen = new Set<string>()
    return ports.filter((p) => {
      if (seen.has(p.code)) return false
      seen.add(p.code)
      return true
    })
  }, [ports])

  const selectedPort = uniquePorts.find((p) => p.code === value || p.name === value || p.name_cn === value)

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
          {selectedPort ? (
            <span className="flex items-center gap-2 truncate">
              <Anchor className="h-4 w-4 shrink-0 text-muted-foreground" />
              {getDisplayName(selectedPort)}
            </span>
          ) : value ? (
            <span className="flex items-center gap-2 truncate">
              <Anchor className="h-4 w-4 shrink-0 text-muted-foreground" />
              {value}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {placeholder || (locale === 'zh' ? '选择港口' : 'Select port')}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("common.search") || "Search..."} />
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <CommandEmpty>{t("common.noData")}</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {uniquePorts.map((port) => (
                  <CommandItem
                    key={port.code}
                    value={`${port.name} ${port.name_cn || ""} ${port.code}`}
                    onSelect={() => {
                      onChange(port.name === value ? "" : port.name)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        (value === port.code || value === port.name || value === port.name_cn) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getDisplayName(port)}</span>
                        <span className="text-xs text-muted-foreground font-mono">{port.code}</span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
