"use client"

import { useSearchParams } from "next/navigation"
import { FileManager } from "@/components/disk/file-manager"

export default function DiskPage() {
  const searchParams = useSearchParams()
  const path = searchParams.get("path") || ""

  return (
    <div className="h-[calc(100vh-4rem)]">
      <FileManager initialPath={path} />
    </div>
  )
}
