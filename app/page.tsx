import { HeroSlider } from "@/components/home/hero-slider"
import { CategoriesSection } from "@/components/home/categories-section"
import { FeaturedProducts } from "@/components/home/featured-products"
import { AboutSection } from "@/components/home/about-section"
import { CtaBanner } from "@/components/home/cta-banner"

export default function HomePage() {
  return (
    <>
      <HeroSlider />
      <CategoriesSection />
      <FeaturedProducts />
      <AboutSection />
      <CtaBanner />
    </>
  )
}
