"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import { products } from "@/lib/mock-data"
import { ProductDetail } from "@/components/products/product-detail"

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const product = products.find((p) => p.slug === slug)

  if (!product) {
    notFound()
  }

  return <ProductDetail product={product} />
}
