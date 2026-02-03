/**
 * Column Definition Helper
 * 
 * Helper function to create column definitions with editable cells.
 */

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"

export type CellType = 'text' | 'select' | 'country' | 'date' | 'number' | 'email' | 'link'

export interface SelectOption {
  label: string
  value: string
  variant?: "default" | "secondary" | "destructive" | "outline"
}

export interface ColumnConfig<TData> {
  accessorKey: keyof TData & string
  header: string
  cellType?: CellType
  editable?: boolean
  options?: SelectOption[]
  linkPattern?: string
  validation?: (value: unknown) => string | null
  sortable?: boolean
  filterable?: boolean
  format?: (value: unknown) => string
  min?: number
  max?: number
  dateFormat?: string
  external?: boolean
  showBadge?: boolean
}

export interface CreateColumnOptions<TData> {
  onCellUpdate?: (rowId: string, columnId: string, value: unknown) => Promise<void>
  getRowId?: (row: TData) => string
}

/**
 * Create a column definition from config
 */
export function createColumn<TData>(
  config: ColumnConfig<TData>,
  options?: CreateColumnOptions<TData>
): ColumnDef<TData> {
  const {
    accessorKey,
    header,
    cellType = 'text',
    editable = false,
    sortable = true,
    linkPattern,
    format,
  } = config

  const column: ColumnDef<TData> = {
    accessorKey,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={header} />
    ),
    enableSorting: sortable,
  }

  // For non-editable cells, use simple cell renderer
  if (!editable) {
    column.cell = ({ getValue }) => {
      const value = getValue()
      
      if (cellType === 'link' && linkPattern) {
        // Import dynamically to avoid circular deps
        const displayValue = format ? format(value) : String(value || '')
        if (!displayValue) return <span className="text-muted-foreground">-</span>
        
        const url = linkPattern.replace(/\{value\}/g, encodeURIComponent(displayValue))
        return (
          <a
            href={url}
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {displayValue}
          </a>
        )
      }
      
      if (format) {
        return <span>{format(value)}</span>
      }
      
      return <span>{String(value ?? '-')}</span>
    }
  }

  return column
}

/**
 * Create multiple columns from configs
 */
export function createColumns<TData>(
  configs: ColumnConfig<TData>[],
  options?: CreateColumnOptions<TData>
): ColumnDef<TData>[] {
  return configs.map((config) => createColumn(config, options))
}

/**
 * Create a selection column for row selection
 */
export function createSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        aria-label="Select all"
        className="h-4 w-4 rounded border-gray-300"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
        className="h-4 w-4 rounded border-gray-300"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }
}

/**
 * Create an actions column
 */
export function createActionsColumn<TData>(
  onView?: (row: TData) => void,
  onEdit?: (row: TData) => void,
  onDelete?: (row: TData) => void
): ColumnDef<TData> {
  return {
    id: "actions",
    cell: ({ row }) => {
      // This will be rendered by DataTableRowActions
      return null
    },
    enableSorting: false,
    enableHiding: false,
  }
}
