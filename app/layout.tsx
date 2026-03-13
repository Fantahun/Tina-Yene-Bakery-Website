import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReduxProvider } from "@/store/provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

// Public App Router pages export `revalidate` individually for ISR.
// `app/yeneAdmin/**` is intentionally left dynamic and does not opt into ISR.

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yenebakery.com";
const siteName = "YeneBakery";
const title = "YeneBakery | Fresh Artisan Baked Goods";
const description =
    "Yene bakery provides handcrafted artisan breads, pastries, cakes, and custom orders. Made with love and the finest ingredients. Order online for pickup or delivery.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: title,
    template: "%s | YeneBakery",
  },
  description,
  category: "Bakery",
  keywords: [
    "yenebakery",
    "የኔ ቤከሪ",
    "የኔ",
    "yene bakery",
    "yene bakery website",
    "yenebakery.com",
    "yenebakery.org",
    "yenebakery.net",
    "yenebakery.ai",
    "bakery",
    "artisan bakery",
    "fresh bread",
    "pastries",
    "cakes",
    "custom cakes",
    "bakery near me",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title,
    description,
    locale: "en_US",
    images: [
      {
        url: "/images/logo/yene-bakery-logo-nav.jpg",
        width:1200,
        height:630,
        alt: "YeneBakery logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/logo/yene-bakery-logo-nav.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/favicon/favicon.ico",
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#C4915C",
  width: "device-width",
  initialScale:1,
  userScalable: true,
};

const bakeryJsonLd = {
  "@context": "https://schema.org",
  "@type": "Bakery",
  "@id": `${siteUrl}#bakery`,
  name: "YeneBakery",
  alternateName: ["Yene Bakery", "yenebakery"],
  url: siteUrl,
  description,
  image: `${siteUrl}/images/logo/yene-bakery-logo-nav.jpg`,
  logo: `${siteUrl}/images/logo/yene-bakery-logo-nav.jpg`,
  telephone: "+1-425-312-3140",
  email: "hello@yenebakery.com",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "07:00",
      closes: "19:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "08:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Sunday",
      opens: "08:00",
      closes: "16:00",
    },
  ],
};

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  const maintenanceEnabled = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
  const comingSoonEnabled = process.env.NEXT_PUBLIC_COMING_SOON === "true";
  const publicModeEnabled = maintenanceEnabled || comingSoonEnabled;

  return (
      <html lang="en">
      <body className={`${_geist.className} ${_geistMono.className} font-sans antialiased`}
            suppressHydrationWarning >
      <script type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(bakeryJsonLd) }}
      />
      <ReduxProvider>
        {publicModeEnabled ? (
            <main>{children}</main>
        ) : (
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
        )}
        <Toaster position="top-right" richColors />
      </ReduxProvider>
      </body>
      </html>
  );
}
