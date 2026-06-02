import { z } from "zod"

export const ErrorResponse = z.object({
  error: z.string(),
})

export const SuccessResponse = z.object({
  success: z.boolean(),
})

export const PaginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    perPage: z.number(),
  })

export const ImportResultSchema = z.object({
  total: z.number(),
  success: z.number(),
  failed: z.number(),
  created: z.number(),
  updated: z.number(),
  errors: z.array(
    z.object({
      row: z.number(),
      error: z.string(),
    })
  ),
})

export const FileInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
  size: z.number(),
  lastModified: z.string(),
  contentType: z.string().optional(),
})

export const FolderInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
})

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
