export interface Category {
  id: number
  name: string
  slug: string
  description: string
  image_url: string
  sort_order: number
  is_active: boolean
}

export interface Product {
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
}

export interface PickupLocation {
  id: number
  name: string
  address: string
  is_active: boolean
}

export interface OrderStatusEntry {
  id: number
  name: string
  description?: string
  sort_order: number
  is_active: boolean
}

export const categories: Category[] = [
  {
    id: 1,
    name: "Artisan Breads",
    slug: "artisan-breads",
    description: "Hand-crafted loaves baked fresh daily with premium ingredients",
    image_url: "/images/cat-breads.jpg",
    sort_order: 1,
    is_active: true,
  },
  {
    id: 2,
    name: "Cakes & Pastries",
    slug: "cakes-pastries",
    description: "Beautifully decorated cakes and delicate pastries for every occasion",
    image_url: "/images/cat-cakes.jpg",
    sort_order: 2,
    is_active: true,
  },
  {
    id: 3,
    name: "Cookies & Treats",
    slug: "cookies-treats",
    description: "Freshly baked cookies, brownies, and sweet treats",
    image_url: "/images/cat-cookies.jpg",
    sort_order: 3,
    is_active: true,
  },
  {
    id: 4,
    name: "Custom Orders",
    slug: "custom-orders",
    description: "Special celebration cakes and custom baked goods made to order",
    image_url: "/images/cat-custom.jpg",
    sort_order: 4,
    is_active: true,
  },
]

export const products: Product[] = [
  {
    id: 1,
    category_id: 1,
    name: "Sourdough Loaf",
    slug: "sourdough-loaf",
    description: "Our signature sourdough with a crisp crust and tender, tangy crumb. Made with a 24-hour fermented starter for exceptional flavor and texture.",
    price: 8.50,
    image_url: "/images/sourdough.jpg",
    prep_lead_time_days: 0,
    pickup_allowed: true,
    delivery_allowed: true,
    is_active: true,
    sort_order: 1,
    category: "Artisan Breads",
  },
  {
    id: 2,
    category_id: 1,
    name: "Ciabatta",
    slug: "ciabatta",
    description: "Light, airy Italian bread with an open crumb and golden crust. Perfect for sandwiches or dipping in olive oil.",
    price: 6.50,
    image_url: "/images/ciabatta.jpg",
    prep_lead_time_days: 0,
    pickup_allowed: true,
    delivery_allowed: true,
    is_active: true,
    sort_order: 2,
    category: "Artisan Breads",
  },
  {
    id: 3,
    category_id: 1,
    name: "Multigrain Loaf",
    slug: "multigrain-loaf",
    description: "A hearty blend of whole wheat, oats, flaxseed, and sunflower seeds. Nutritious and delicious.",
    price: 9.00,
    image_url: "/images/multigrain.jpg",
    prep_lead_time_days: 0,
    pickup_allowed: true,
    delivery_allowed: true,
    is_active: true,
    sort_order: 3,
    category: "Artisan Breads",
  },
  {
    id: 4,
    category_id: 2,
    name: "Classic Croissant",
    slug: "classic-croissant",
    description: "Buttery, flaky French croissant made with imported European butter. 36 layers of laminated dough for the perfect crisp.",
    price: 4.50,
    image_url: "/images/croissant.jpg",
    prep_lead_time_days: 0,
    pickup_allowed: true,
    delivery_allowed: true,
    is_active: true,
    sort_order: 1,
    category: "Cakes & Pastries",
  },
  {
    id: 5,
    category_id: 2,
    name: "Chocolate Eclair",
    slug: "chocolate-eclair",
    description: "Classic French pastry filled with vanilla custard and topped with rich dark chocolate ganache.",
    price: 5.50,
    image_url: "/images/eclair.jpg",
    prep_lead_time_days: 0,
    pickup_allowed: true,
    delivery_allowed: true,
    is_active: true,
    sort_order: 2,
    category: "Cakes & Pastries",
  },
  {
    id: 6,
    category_id: 2,
    name: "Fruit Tart",
    slug: "fruit-tart",
    description: "Delicate pate sucree shell filled with pastry cream and topped with an array of fresh seasonal fruits.",
    price: 7.00,
    image_url: "/images/fruit-tart.jpg",
    prep_lead_time_days: 1,
    pickup_allowed: true,
    delivery_allowed: true,
    is_active: true,
    sort_order: 3,
    category: "Cakes & Pastries",
  },
  {
    id: 7,
    category_id: 3,
    name: "Chocolate Chip Cookies (6-pack)",
    slug: "chocolate-chip-cookies",
    description: "Our famous chocolate chip cookies made with brown butter and premium dark chocolate chunks. Crisp edges, chewy center.",
    price: 12.00,
    image_url: "/images/cookies.jpg",
    prep_lead_time_days: 0,
    pickup_allowed: true,
    delivery_allowed: true,
    is_active: true,
    sort_order: 1,
    category: "Cookies & Treats",
  },
  {
    id: 8,
    category_id: 3,
    name: "Brownies (4-pack)",
    slug: "brownies",
    description: "Dense, fudgy brownies made with high-quality cocoa and a hint of espresso to deepen the chocolate flavor.",
    price: 14.00,
    image_url: "/images/brownies.jpg",
    prep_lead_time_days: 0,
    pickup_allowed: true,
    delivery_allowed: true,
    is_active: true,
    sort_order: 2,
    category: "Cookies & Treats",
  },
  {
    id: 9,
    category_id: 3,
    name: "Macarons Box (12-pack)",
    slug: "macarons-box",
    description: "Assorted French macarons in flavors including vanilla, pistachio, raspberry, chocolate, and salted caramel.",
    price: 24.00,
    image_url: "/images/macarons.jpg",
    prep_lead_time_days: 1,
    pickup_allowed: true,
    delivery_allowed: true,
    is_active: true,
    sort_order: 3,
    category: "Cookies & Treats",
  },
  {
    id: 10,
    category_id: 4,
    name: "Custom Celebration Cake",
    slug: "custom-celebration-cake",
    description: "A personalized cake designed for your special occasion. Choose from our range of flavors, fillings, and decorations. Serves 12-16 guests.",
    price: 85.00,
    image_url: "/images/custom-cake.jpg",
    prep_lead_time_days: 3,
    pickup_allowed: true,
    delivery_allowed: true,
    is_active: true,
    sort_order: 1,
    category: "Custom Orders",
  },
  {
    id: 11,
    category_id: 4,
    name: "Wedding Cupcake Tower (48-pack)",
    slug: "wedding-cupcake-tower",
    description: "An elegant tower of 48 beautifully decorated cupcakes. Perfect as an alternative to a traditional wedding cake.",
    price: 150.00,
    image_url: "/images/cupcake-tower.jpg",
    prep_lead_time_days: 5,
    pickup_allowed: true,
    delivery_allowed: false,
    is_active: true,
    sort_order: 2,
    category: "Custom Orders",
  },
  {
    id: 12,
    category_id: 2,
    name: "Cinnamon Roll",
    slug: "cinnamon-roll",
    description: "Soft, pillowy cinnamon roll swirled with cinnamon-sugar and topped with a generous drizzle of cream cheese icing.",
    price: 5.00,
    image_url: "/images/cinnamon-roll.jpg",
    prep_lead_time_days: 0,
    pickup_allowed: true,
    delivery_allowed: true,
    is_active: true,
    sort_order: 4,
    category: "Cakes & Pastries",
  },
]

export const pickupLocations: PickupLocation[] = [
  {
    id: 1,
    name: "YeneBakery Main Store",
    address: "123 Baker Street, Suite 100, Downtown",
    is_active: true,
  },
  {
    id: 2,
    name: "YeneBakery Westside",
    address: "456 Elm Avenue, Westside Shopping Center",
    is_active: true,
  },
]

export const siteSettings = {
  cutoff_time: "11:00",
  delivery_fee: 5.99,
  min_order_delivery: 25.00,
  store_phone: "(555) 123-4567",
  store_email: "hello@YeneBakery.com",
}

export type OrderStatus = string

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded"

export interface Order {
  id: string
  confirmation_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  business_name?: string
  fulfillment_method: "pickup" | "delivery"
  fulfillment_date: string
  pickup_location?: string
  delivery_address?: string
  subtotal: number
  delivery_fee: number
  total: number
  order_notes?: string
  order_status: OrderStatus
  order_status_id?: number
  payment_status: PaymentStatus
  created_at: string
  items: Array<{
    product_name: string
    quantity: number
    unit_price: number
    line_total: number
  }>
}

export const mockOrders: Order[] = [
  {
    id: "a81bc81b-dead-4e5d-abff-90865d1e",
    confirmation_number: "TB-ABC123",
    customer_name: "Sarah Johnson",
    customer_email: "sarah@example.com",
    customer_phone: "(555) 111-2222",
    fulfillment_method: "pickup",
    fulfillment_date: "2026-02-15",
    pickup_location: "YeneBakery Main Store",
    subtotal: 21.50,
    delivery_fee: 0,
    total: 21.50,
    order_notes: "Please add extra icing on the cinnamon roll",
    order_status: "pending",
    payment_status: "paid",
    created_at: "2026-02-12T09:30:00Z",
    items: [
      { product_name: "Sourdough Loaf", quantity: 1, unit_price: 8.50, line_total: 8.50 },
      { product_name: "Classic Croissant", quantity: 2, unit_price: 4.50, line_total: 9.00 },
      { product_name: "Cinnamon Roll", quantity: 1, unit_price: 5.00, line_total: 5.00 },
    ],
  },
  {
    id: "a8c81b-dead-4e5d-abff-90865d1e",
    confirmation_number: "TB-DEF456",
    customer_name: "Mike Chen",
    customer_email: "mike@business.com",
    customer_phone: "(555) 333-4444",
    business_name: "Chen Corp",
    fulfillment_method: "delivery",
    fulfillment_date: "2026-02-16",
    delivery_address: "456 Business Blvd, Suite 200, Downtown 90210",
    subtotal: 50.00,
    delivery_fee: 5.99,
    total: 55.99,
    order_status: "in_preparation",
    payment_status: "paid",
    created_at: "2026-02-12T11:00:00Z",
    items: [
      { product_name: "Chocolate Chip Cookies (6-pack)", quantity: 2, unit_price: 12.00, line_total: 24.00 },
      { product_name: "Macarons Box (12-pack)", quantity: 1, unit_price: 24.00, line_total: 24.00 },
    ],
  },
  {
    id: "a81bc81b-dead-4e5d-abff-90865d1e1ee",
    confirmation_number: "TB-GHI789",
    customer_name: "Emily Davis",
    customer_email: "emily@email.com",
    customer_phone: "(555) 555-6666",
    fulfillment_method: "pickup",
    fulfillment_date: "2026-02-18",
    pickup_location: "YeneBakery Westside",
    subtotal: 85.00,
    delivery_fee: 0,
    total: 85.00,
    order_notes: "Write 'Happy Birthday Sarah!' in blue icing. Flavor: chocolate with raspberry filling.",
    order_status: "pending",
    payment_status: "paid",
    created_at: "2026-02-11T14:20:00Z",
    items: [
      { product_name: "Custom Celebration Cake", quantity: 1, unit_price: 85.00, line_total: 85.00 },
    ],
  },
  {
    id: "a81bc81b-dead-5d-abff-90865d1e13b1",
    confirmation_number: "TB-JKL012",
    customer_name: "Tom Wilson",
    customer_email: "tom@email.com",
    customer_phone: "(555) 777-8888",
    fulfillment_method: "pickup",
    fulfillment_date: "2026-02-13",
    pickup_location: "YeneBakery Main Store",
    subtotal: 15.00,
    delivery_fee: 0,
    total: 15.00,
    order_status: "ready_for_pickup",
    payment_status: "paid",
    created_at: "2026-02-10T16:45:00Z",
    items: [
      { product_name: "Multigrain Loaf", quantity: 1, unit_price: 9.00, line_total: 9.00 },
      { product_name: "Ciabatta", quantity: 1, unit_price: 6.50, line_total: 6.50 },
    ],
  },
  {
    id: "a81bc81b-dead-4e5d-abff-90865d1eqw",
    confirmation_number: "TB-MNO345",
    customer_name: "Lisa Park",
    customer_email: "lisa@design.co",
    customer_phone: "(555) 999-0000",
    business_name: "Park Design Co",
    fulfillment_method: "delivery",
    fulfillment_date: "2026-02-20",
    delivery_address: "789 Creative Ln, Apt 3A, Artsville 90211",
    subtotal: 178.50,
    delivery_fee: 5.99,
    total: 184.49,
    order_notes: "Elegant styling for cupcakes - gold and white theme",
    order_status: "pending",
    payment_status: "paid",
    created_at: "2026-02-12T08:15:00Z",
    items: [
      { product_name: "Wedding Cupcake Tower (48-pack)", quantity: 1, unit_price: 150.00, line_total: 150.00 },
      { product_name: "Brownies (4-pack)", quantity: 1, unit_price: 14.00, line_total: 14.00 },
      { product_name: "Fruit Tart", quantity: 2, unit_price: 7.00, line_total: 14.00 },
    ],
  },
]
