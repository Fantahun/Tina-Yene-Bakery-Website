"use client"

import { Wheat, Clock, Heart, Truck } from "lucide-react"

const features = [
  {
    icon: Wheat,
    title: "Premium Ingredients",
    description:
      "We source the finest organic flours, European butter, and seasonal produce for every recipe.",
  },
  {
    icon: Clock,
    title: "Baked Fresh Daily",
    description:
      "Our bakers start at 4am to ensure everything is fresh from the oven when you arrive.",
  },
  {
    icon: Heart,
    title: "Made with Love",
    description:
      "Every loaf, pastry, and cake is handcrafted with care and decades of baking expertise.",
  },
  {
    icon: Truck,
    title: "Pickup & Delivery",
    description:
      "Order online and pick up in store, or have your favorites delivered right to your door.",
  },
]

export function AboutSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mb-12 text-center">
        <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Why TinaBakery?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
          More than just a bakery, we are a community built on the love of great bread and pastries
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.title}
              className="flex flex-col items-center text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
