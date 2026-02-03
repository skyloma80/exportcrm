'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FileManager, SelectedFileInfo } from './file-manager'

interface FilePickerDialogProps {
  /** 是否打开 */
  open: boolean
  /** 打开状态变化回调 */
  onOpenChange: (open: boolean) => void
  /** 选择确认回调 */
  onSelect: (files: SelectedFileInfo[]) => void
  /** 是否允许多选 */
  multiple?: boolean
  /** 限制可选文件类型，如 ['pdf', 'docx'] */
  acceptTypes?: string[]
  /** 初始路径 */
  initialPath?: string
}

/**
 * 文件选择器对话框
 * 
 * 使用示例：
 * ```tsx
 * const [open, setOpen] = useState(false)
 * 
 * <FilePickerDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onSelect={(files) => {
 *     console.log('Selected files:', files)
 *     setOpen(false)
 *   }}
 *   multiple={true}
 *   acceptTypes={['pdf', 'docx']}
 * />
 * ```
 */
export function FilePickerDialog({
  open,
  onOpenChange,
  onSelect,
  multiple = true,
  acceptTypes,
  initialPath = '',
}: FilePickerDialogProps) {
  const handleSelect = (files: SelectedFileInfo[]) => {
    onSelect(files)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] p-0 overflow-hidden">
        <FileManager
          mode="select"
          multiple={multiple}
          acceptTypes={acceptTypes}
          initialPath={initialPath}
          onSelect={handleSelect}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  )
}

// 导出类型供外部使用
export type { SelectedFileInfo }
