export type ShopCategory = {
  id: number
  name: string
  slug: string
  image_url: string
}

export type ShopProduct = {
  id: number
  category_id: number
  name: string
  slug: string
  description: string
  price: number
  image_url: string
  prep_lead_time_days: number
  pickup_allowed: boolean
  delivery_allowed: boolean
  is_active: boolean
  sort_order: number
  category?: string
  category_slug?: string
}

