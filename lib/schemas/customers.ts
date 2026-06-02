import { z } from "zod"

export const CustomerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  name_cn: z.string().optional(),
  country: z.string().length(2),
  type: z.enum(["direct", "agent", "distributor"]),
  rating: z.number().min(1).max(5).optional(),
  preferred_currency: z.string().length(3).optional(),
  address: z.string().optional(),
  address_cn: z.string().optional(),
  website: z.string().optional(),
  remarks: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})
