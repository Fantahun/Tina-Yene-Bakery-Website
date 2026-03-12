import Image from "next/image";
import { CountdownTimer } from "@/components/coming-soon/countdown-timer";

export const revalidate = 86400

export default function ComingSoonPage() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-amber-50 via-orange-50 to-rose-100">
      <div className="absolute inset-0 opacity-10">
        <Image
          src="/images/cupcake-tower.jpg"
          alt="Classic pastry backdrop"
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="pointer-events-none absolute -left-16 top-20 h-56 w-56 rounded-full bg-amber-200/40 blur-3xl motion-safe:animate-pulse" />
      <div className="pointer-events-none absolute -right-10 bottom-16 h-52 w-52 rounded-full bg-rose-200/40 blur-3xl motion-safe:animate-pulse" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-6 motion-safe:duration-700">
            <div className="relative h-24 w-24 sm:h-28 sm:w-28">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-2 rounded-full bg-[conic-gradient(from_0deg,_rgba(251,191,36,0.78),_rgba(251,113,133,0.72),_rgba(245,158,11,0.78),_rgba(251,191,36,0.78))] opacity-90 blur-[1px] animate-aurora-spin"
              />
              <div className="absolute inset-1 rounded-full bg-white/90" />
              <Image
                src="/images/logo/yene-bakery.png"
                alt="Yene Bakery logo"
                fill
                className="relative rounded-full object-contain p-1"
                sizes="(max-width: 640px) 96px, 112px"
                priority
              />
            </div>

            <p className="inline-flex rounded-full border border-amber-300 bg-white/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800 shadow-sm">
              Grand Opening Soon
            </p>

            <h1 className="text-4xl font-bold leading-tight text-amber-950 sm:text-5xl lg:text-6xl">
              Yene<span className="text-primary">Bakery</span>
            </h1>

            <p className="max-w-xl text-base text-amber-900/90 sm:text-lg">
              A classic cake and pastry collection is on the way. We are adding
              the finishing touches to custom cake orders, pickup scheduling,
              and delivery checkout.
            </p>

            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
              <CountdownTimer targetDate={process.env.NEXT_PUBLIC_COMING_SOON_TARGET_DATE} />
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">
                Stay Tuned
              </h2>
              <p className="mt-2 text-sm text-amber-900/90 sm:text-base">
                We will launch the full bakery experience soon. Thank you for
                your patience and support.
              </p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700">
            <div className="relative aspect-[4/5]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-1 rounded-[1.9rem] bg-[conic-gradient(from_var(--border-angle),_rgba(251,191,36,0.82),_rgba(244,114,182,0.72),_rgba(251,146,60,0.82),_rgba(251,191,36,0.82))] opacity-90 blur-[1px] animate-conic-border-flow"
              />
              <div className="relative h-full w-full overflow-hidden rounded-3xl border border-amber-100 bg-white p-3 shadow-2xl transition-transform duration-500 hover:-translate-y-1">
                <Image
                  src="/images/custom-cake.jpg"
                  alt="Classic custom cake showcase"
                  fill
                  className="rounded-[1.25rem] object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden rounded-xl border border-amber-200 bg-white/95 px-4 py-2 text-sm font-medium text-amber-800 shadow-lg sm:block motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">
              Fresh cakes and pastries, baked daily.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
