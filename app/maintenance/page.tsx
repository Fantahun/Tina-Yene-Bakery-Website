import Image from "next/image";

export default function MaintenancePage() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.14),transparent_40%),radial-gradient(circle_at_85%_15%,rgba(244,114,182,0.12),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.12),transparent_42%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-6 motion-safe:duration-700">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.9)] motion-safe:animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                Maintenance Mode
              </span>
            </div>

            <div className="relative h-24 w-24 overflow-hidden rounded-full border border-white/15 bg-white/10 p-2 shadow-lg shadow-black/30 sm:h-20 sm:w-20">
              <Image
                src="/images/logo/yene-bakery.png"
                alt="Yene Bakery logo"
                fill
                className="object-contain "
                priority
              />
            </div>

            <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              We are polishing
              <span className="bg-gradient-to-r from-amber-200 via-rose-200 to-blue-200 bg-clip-text text-transparent">
                {" "}
                YeneBakery website experience
              </span>
            </h1>

            <p className="max-w-xl text-base text-slate-300 sm:text-lg">
              Our storefront is temporarily unavailable while we deploy updates
              and improve performance.
            </p>

            <div className="rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-slate-300 backdrop-blur">
              Thank you for your patience.
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-6 motion-safe:duration-700">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-3 shadow-2xl shadow-black/40 backdrop-blur-sm">
              <Image
                src="/images/cat-cookies.jpg"
                alt="Yene Bakery storefront"
                fill
                className="rounded-[1.3rem] object-cover"
              />
              <div className="absolute inset-0 rounded-[1.3rem] bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
