import { ShopPageClient } from "./shop-page-client";

interface ShopPageProps {
  searchParams?: {
    category?: string;
  };
}

export default function ShopPage({ searchParams }: ShopPageProps) {
  const initialCategory = searchParams?.category ?? null;

  return <ShopPageClient initialCategory={initialCategory} />;
}
