"use client"

import { useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Swiper, SwiperSlide } from "swiper/react"
import { Autoplay, Pagination, EffectFade } from "swiper/modules"
import type { Swiper as SwiperType } from "swiper"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

import "swiper/css"
import "swiper/css/pagination"
import "swiper/css/effect-fade"

const slides = [
  {
    image: "/images/hero-1.jpg",
    title: "Freshly Baked, Every Day",
    subtitle:
      "Artisan breads and pastries crafted with care using the finest ingredients",
    cta: "Shop Now",
    href: "/shop",
  },
  {
    image: "/images/hero-2.jpg",
    title: "Buttery Perfection",
    subtitle:
      "Flaky croissants and delicate pastries made with imported European butter",
    cta: "View Pastries",
    href: "/shop?category=cakes-pastries",
  },
  {
    image: "/images/hero-3.jpg",
    title: "Custom Celebrations",
    subtitle:
      "Beautifully crafted cakes designed for your most special moments",
    cta: "Order Custom",
    href: "/shop?category=custom-orders",
  },
]

export function HeroSlider() {
  const swiperRef = useRef<SwiperType | null>(null)

  return (
    <section className="relative" aria-label="Featured content">
      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper
        }}
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop
        className="h-[420px] sm:h-[520px] lg:h-[600px]"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <div className="relative flex h-full w-full items-center justify-center">
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover"
                priority={index === 0}
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-foreground/40" />
              <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
                <h1 className="text-balance text-3xl font-bold tracking-tight text-background sm:text-4xl lg:text-5xl">
                  {slide.title}
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-background/90 sm:text-lg">
                  {slide.subtitle}
                </p>
                <Button
                  asChild
                  size="lg"
                  className="mt-8"
                >
                  <Link href={slide.href}>{slide.cta}</Link>
                </Button>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Navigation Arrows */}
      <button
        onClick={() => swiperRef.current?.slidePrev()}
        className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md transition-colors hover:bg-background"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => swiperRef.current?.slideNext()}
        className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md transition-colors hover:bg-background"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </section>
  )
}
