import { z } from "zod"

 

export const FolderTreeSchema: z.ZodType<FolderTree> = z.object({
  name: z.string(),
  path: z.string(),
  children: z.lazy(() => z.array(FolderTreeSchema)),
})

export interface FolderTree {
  name: string
  path: string
  children: FolderTree[]
}
