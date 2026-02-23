import { ShopPageClient } from "./shop-page-client";

interface ShopPageProps {
  searchParams?: Promise<{
    category?: string;
  }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialCategory = resolvedSearchParams?.category ?? null;

  return <ShopPageClient initialCategory={initialCategory} />;
}
