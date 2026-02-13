import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Wheat, Clock, Heart, Truck, Award, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about YeneBakery, our story, values, and commitment to crafting the finest artisan baked goods with love and premium ingredients.",
};

const values = [
  {
    icon: Wheat,
    title: "Premium Ingredients",
    description:
      "We source the finest organic flours, European butter, and seasonal produce for every recipe. No shortcuts, no compromises.",
  },
  {
    icon: Clock,
    title: "Baked Fresh Daily",
    description:
      "Our bakers start at 4am to ensure everything is fresh from the oven when you arrive. Nothing is ever day-old.",
  },
  {
    icon: Heart,
    title: "Made with Love",
    description:
      "Every loaf, pastry, and cake is handcrafted with care and decades of baking expertise passed through generations.",
  },
  {
    icon: Truck,
    title: "Pickup & Delivery",
    description:
      "Order online and pick up in store, or have your favorites delivered right to your door. Freshness guaranteed.",
  },
  {
    icon: Award,
    title: "Award Winning",
    description:
      "Recognized by local food critics and community members alike. Our sourdough has won three consecutive best-bread awards.",
  },
  {
    icon: Users,
    title: "Community First",
    description:
      "We partner with local farms, sponsor school events, and donate unsold bread daily to neighborhood shelters.",
  },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative">
        <div className="relative h-[340px] w-full overflow-hidden sm:h-[420px]">
          <Image
            src="/images/about-bakery.jpg"
            alt="Inside YeneBakery - our bakers at work"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-foreground/50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="mx-auto max-w-3xl px-4 text-center">
              <h1 className="text-balance text-3xl font-bold tracking-tight text-background sm:text-4xl lg:text-5xl">
                Our Story
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-background/90 sm:text-lg">
                From a family kitchen to your neighborhood bakery, every crumb
                carries a legacy of passion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Since 2012
            </p>
            <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              A Passion for Great Bread
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                YeneBakery began in the heart of a small family kitchen. What
                started as weekend baking sessions with cherished family recipes
                quickly blossomed into something the whole neighborhood looked
                forward to. Friends and neighbors kept asking for more, so in
                2012 we opened our first storefront on Baker Street.
              </p>
              <p>
                Today, we are proud to serve our community with the same love
                and attention to detail that started it all. Our head baker,
                Tina, still personally oversees every batch that leaves the
                oven. We believe that great bread begins with great ingredients
                and even greater care.
              </p>
              <p>
                From our signature sourdough to custom celebration cakes, every
                item on our menu is crafted by hand. We never use artificial
                preservatives, and we source locally whenever possible. That is
                the YeneBakery promise.
              </p>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border">
            <Image
              src="/images/hero-1.jpg"
              alt="Artisan bread display at YeneBakery"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <Separator className="mx-auto max-w-7xl" />

      {/* Values Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            What We Stand For
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
            More than just a bakery, we are a community built on the love of
            great bread and pastries.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <div
                key={value.title}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <Separator className="mx-auto max-w-7xl" />

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Taste the Difference
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            Whether you are looking for your daily sourdough, a weekend treat,
            or a show-stopping custom cake for a special occasion, we have
            something for everyone.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/shop">Browse Our Menu</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contact">Get in Touch</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
