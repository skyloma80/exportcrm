"use client"

/**
 * LinkCell Component
 * 
 * Renders value as a link with configurable URL pattern.
 * Supports {value} placeholder replacement.
 */

import * as React from "react"
import { ExternalLink } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface LinkCellProps {
  value: string
  linkPattern: string // e.g., "/items/{value}" or "https://example.com/{value}"
  tooltip?: string
  external?: boolean
  className?: string
}

/**
 * Generate URL from pattern by replacing {value} placeholder
 */
export function generateLinkUrl(pattern: string, value: string): string {
  return pattern.replace(/\{value\}/g, encodeURIComponent(value))
}

export function LinkCell({
  value,
  linkPattern,
  tooltip,
  external = false,
  className,
}: LinkCellProps) {
  if (!value) {
    return <span className="text-muted-foreground">-</span>
  }

  const url = generateLinkUrl(linkPattern, value)
  const displayTooltip = tooltip || url

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={url}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="text-primary hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate">{value}</span>
            {external && <ExternalLink className="h-3 w-3 flex-shrink-0" />}
          </a>
        </TooltipTrigger>
        <TooltipContent>
          {displayTooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
