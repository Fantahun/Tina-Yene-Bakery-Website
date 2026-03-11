import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReduxProvider } from "@/store/provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "YeneBakery | Fresh Artisan Baked Goods",
    template: "%s | YeneBakery",
  },
  description:
    "Handcrafted artisan breads, pastries, cakes, and custom orders. Made with love and the finest ingredients. Order online for pickup or delivery.",
};

export const viewport: Viewport = {
  themeColor: "#C4915C",
  width: "device-width",
  initialScale: 1,
  userScalable: true,
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
      <body
        className={`${_geist.className} ${_geistMono.className} font-sans antialiased`}
        suppressHydrationWarning
      >
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
