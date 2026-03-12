import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, Cookie, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const revalidate = 86400

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how YeneBakery collects, uses, and protects your personal information when you visit our website or place an order.",
};

const sections = [
  {
    title: "1. Information We Collect",
    paragraphs: [
      "We collect information that you voluntarily provide to us when you place an order, create an account, subscribe to our newsletter, or contact us.",
      "This may include your name, email address, phone number, billing and delivery addresses, and order details.",
    ],
  },
  {
    title: "2. How We Use Your Information",
    paragraphs: [
      "We use your information to process and fulfill your orders, communicate with you about your purchases, and provide customer support.",
      "With your consent, we may also send you updates about new menu items, promotions, and special events at YeneBakery.",
    ],
  },
  {
    title: "3. Cookies & Tracking",
    paragraphs: [
      "We use cookies and similar technologies to remember your preferences, keep items in your cart, and understand how visitors use our website.",
      "You can adjust your browser settings to refuse cookies, but some features of the site may not function properly.",
    ],
  },
  {
    title: "4. Sharing Your Information",
    paragraphs: [
      "We do not sell your personal information. We may share limited data with trusted service providers (such as payment processors and delivery partners) solely to complete your orders.",
      "These partners are required to protect your information and use it only for the services they provide on our behalf.",
    ],
  },
  {
    title: "5. Data Security",
    paragraphs: [
      "We take reasonable technical and organizational measures to protect your information from unauthorized access, loss, or misuse.",
      "However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    title: "6. Your Rights",
    paragraphs: [
      "You may request access to, correction of, or deletion of your personal information, subject to applicable laws.",
      "If you have questions about your data or would like to make a request, please contact us using the details on our Contact page.",
    ],
  },
  {
    title: "7. Updates to This Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time to reflect changes in our practices or for legal reasons.",
      "When we make material changes, we will update the date at the top of this page.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative">
        <div className="relative h-[260px] w-full overflow-hidden sm:h-[320px]">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/70 to-primary/80" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="mx-auto max-w-3xl px-4 text-center text-background">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-background/10">
                <Shield className="h-7 w-7" />
              </div>
              <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Privacy Policy
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-background/90 sm:text-lg">
                Your trust matters to us. Learn how we handle and protect your
                personal information at YeneBakery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="rounded-lg border border-border bg-card p-6 sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-primary">
                Last updated
              </p>
              <p className="text-sm text-muted-foreground">February 13, 2026</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                <Lock className="h-3 w-3" />
                <span>Secure by design</span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                <Cookie className="h-3 w-3" />
                <span>Cookie usage explained</span>
              </div>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <p>
              This Privacy Policy explains how YeneBakery ("we", "us", or "our")
              collects, uses, and protects your information when you visit our
              website, place an order, or otherwise interact with us online.
            </p>

            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-base font-semibold text-foreground">
                  {section.title}
                </h2>
                <div className="mt-2 space-y-3">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ))}

            <p>
              If you have any questions about this Privacy Policy or how we
              handle your information, please reach out through our
              <Link
                href="/contact"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {" "}
                Contact page
              </Link>
              .
            </p>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link href="/">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to home
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              For detailed terms around ordering, payments, and cancellations,
              please review our
              <Link
                href="/terms"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {" "}
                Terms of Service
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
