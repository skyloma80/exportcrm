"use client"

/**
 * File Select Dialog
 * 文件选择对话框
 * 
 * 从 disk 中选择文件的对话框组件
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileManager, SelectedFileInfo } from "./file-manager"

interface FileSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 初始路径 */
  initialPath?: string
  /** 是否允许多选 */
  multiple?: boolean
  /** 限制可选文件类型，如 ['pdf', 'docx'] */
  acceptTypes?: string[]
  /** 选择确认回调 */
  onSelect: (files: SelectedFileInfo[]) => void
  /** 对话框标题 */
  title?: string
}

export function FileSelectDialog({
  open,
  onOpenChange,
  initialPath = "",
  multiple = true,
  acceptTypes,
  onSelect,
  title = "选择文件",
}: FileSelectDialogProps) {
  const handleSelect = (files: SelectedFileInfo[]) => {
    onSelect(files)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <FileManager
            initialPath={initialPath}
            mode="select"
            multiple={multiple}
            acceptTypes={acceptTypes}
            onSelect={handleSelect}
            onCancel={handleCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FileSelectDialog
