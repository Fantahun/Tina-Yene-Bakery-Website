export const DEFAULT_PUBLIC_REVALIDATE_SECONDS = 60 * 60 * 24

export const PUBLIC_PATHS = {
  home: "/",
  about: "/about",
  contact: "/contact",
  customCakes: "/custom-cakes",
  privacy: "/privacy",
  terms: "/terms",
  shop: "/shop",
  comingSoon: "/coming-soon",
  maintenance: "/maintenance",
} as const

export const PUBLIC_REVALIDATE_OPTIONS = [
  { value: "all", label: "All public pages" },
  { value: "home", label: "Home page" },
  { value: "shop", label: "Shop listing" },
  { value: "product", label: "Single product page" },
  { value: "about", label: "About page" },
  { value: "contact", label: "Contact page" },
  { value: "custom-cakes", label: "Custom cakes page" },
  { value: "privacy", label: "Privacy page" },
  { value: "terms", label: "Terms page" },
  { value: "coming-soon", label: "Coming soon page" },
  { value: "maintenance", label: "Maintenance page" },
] as const

export function normalizePublicRevalidatePaths(target: string, slug?: string | null) {
  const trimmedSlug = slug?.trim().replace(/^\/+|\/+$/g, "") ?? ""

  switch (target) {
    case "all":
      return Object.values(PUBLIC_PATHS)
    case "home":
      return [PUBLIC_PATHS.home]
    case "shop":
      return [PUBLIC_PATHS.shop]
    case "product":
      return trimmedSlug ? [`/shop/${trimmedSlug}`] : []
    case "about":
      return [PUBLIC_PATHS.about]
    case "contact":
      return [PUBLIC_PATHS.contact]
    case "custom-cakes":
      return [PUBLIC_PATHS.customCakes]
    case "privacy":
      return [PUBLIC_PATHS.privacy]
    case "terms":
      return [PUBLIC_PATHS.terms]
    case "coming-soon":
      return [PUBLIC_PATHS.comingSoon]
    case "maintenance":
      return [PUBLIC_PATHS.maintenance]
    default:
      return []
  }
}
