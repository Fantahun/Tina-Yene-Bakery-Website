import { z } from "zod"

export const checkoutFormSchema = z
  .object({
    customerName: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(255),
    customerEmail: z.string().email("Please enter a valid email address"),
    customerPhone: z
      .string()
      .min(7, "Please enter a valid phone number")
      .max(50),
    businessName: z.string().max(255).optional().default(""),
    fulfillmentMethod: z.enum(["pickup", "delivery"]),
    pickupLocationId: z.string().optional(),
    deliveryAddress: z.string().optional(),
    deliveryCity: z.string().optional(),
    deliveryState: z.string().optional(),
    deliveryZip: z.string().optional(),
    fulfillmentDate: z.date({ required_error: "Please select a date" }),
    orderNotes: z.string().max(500).optional().default(""),
  })
  .refine(
    (data) => {
      if (data.fulfillmentMethod === "pickup") {
        return !!data.pickupLocationId
      }
      return true
    },
    {
      message: "Please select a pickup location",
      path: ["pickupLocationId"],
    }
  )
  .refine(
    (data) => {
      if (data.fulfillmentMethod === "delivery") {
        return !!data.deliveryAddress && data.deliveryAddress.length >= 5
      }
      return true
    },
    {
      message: "Please enter your delivery address",
      path: ["deliveryAddress"],
    }
  )
  .refine(
    (data) => {
      if (data.fulfillmentMethod === "delivery") {
        return !!data.deliveryCity && data.deliveryCity.length >= 2
      }
      return true
    },
    {
      message: "Please enter your city",
      path: ["deliveryCity"],
    }
  )
  .refine(
    (data) => {
      if (data.fulfillmentMethod === "delivery") {
        return !!data.deliveryZip && data.deliveryZip.length >= 5
      }
      return true
    },
    {
      message: "Please enter your ZIP code",
      path: ["deliveryZip"],
    }
  )

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>

export const adminLoginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export type AdminLoginValues = z.infer<typeof adminLoginSchema>
