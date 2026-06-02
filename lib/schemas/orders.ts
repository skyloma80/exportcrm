import { z } from "zod"

export const OrderItemSchema = z.object({
  id: z.string().optional(),
  product: z.string(),
  product_name: z.string(),
  product_code: z.string(),
  part_number: z.string().optional(),
  description_en: z.string().optional(),
  quantity: z.number().positive(),
  unit: z.string(),
  unit_price: z.number().nonnegative(),
  cost_price: z.number().nonnegative().optional(),
})

export const CreateOrderSchema = z.object({
  customer_id: z.string(),
  project_id: z.string().optional(),
  currency: z.string().length(3).optional(),
  payment_terms: z.string().optional(),
  delivery_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(OrderItemSchema),
})

export const OrderSchema = z.object({
  id: z.string(),
  code: z.string(),
  customer_id: z.string(),
  project_id: z.string().optional(),
  status: z.string(),
  total_amount: z.number(),
  currency: z.string(),
  payment_terms: z.string().optional(),
  delivery_date: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const DocumentSchema = z.object({
  success: z.boolean(),
  path: z.string().optional(),
  documents: z.record(z.string(), z.any()).optional(),
})

export const EmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string().optional(),
  attachments: z.array(z.string()).optional(),
})

export const EmailResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
})
