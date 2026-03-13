import type { Metadata } from "next";
import Link from "next/link";
import { Scale, FileText, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const revalidate = 86400

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the terms and conditions for using the YeneBakery website, placing orders, and engaging with our services.",
};

const sections = [
  {
    title: "1. Introduction",
    paragraphs: [
      'These Terms of Service ("Terms") govern your access to and use of the YeneBakery website and online ordering experience.',
      "By using our website or placing an order, you agree to be bound by these Terms.",
    ],
  },
  {
    title: "2. Orders & Payments",
    paragraphs: [
      "All orders placed through our website are subject to acceptance and availability.",
      "Prices are listed in U.S. dollars and may be updated from time to time. Applicable taxes and fees will be shown at checkout.",
      "We use trusted third-party payment processors to securely handle your payment information.",
    ],
  },
  {
    title: "3. Pickup & Delivery",
    paragraphs: [
      "Estimated pickup and delivery times are provided for convenience and are not guaranteed.",
      "You are responsible for providing accurate contact and delivery information to ensure successful fulfillment of your order.",
    ],
  },
  {
    title: "4. Cancellations & Changes",
    paragraphs: [
      "Because many of our items are baked to order, cancellations or changes may be limited once production has begun.",
      "If you need to adjust an order, please contact us as soon as possible and we will do our best to accommodate your request.",
    ],
  },
  {
    title: "5. Allergies & Dietary Restrictions",
    paragraphs: [
      "Our kitchen handles common allergens including wheat, dairy, eggs, nuts, and soy.",
      "While we take care to prevent cross-contact, we cannot guarantee that any item is completely free from allergens.",
    ],
  },
  {
    title: "6. Acceptable Use",
    paragraphs: [
      "You agree not to misuse our website, attempt to interfere with its proper working, or engage in any activity that violates applicable laws.",
      "We reserve the right to suspend or terminate access for users who violate these Terms.",
    ],
  },
  {
    title: "7. Intellectual Property",
    paragraphs: [
      "All content on this website, including text, images, logos, and designs, is owned by or licensed to YeneBakery and is protected by applicable intellectual property laws.",
      "You may not reproduce, distribute, or create derivative works from our content without our prior written consent.",
    ],
  },
  {
    title: "8. Limitation of Liability",
    paragraphs: [
      "To the fullest extent permitted by law, YeneBakery is not liable for any indirect, incidental, or consequential damages arising from your use of our website or services.",
      "Nothing in these Terms is intended to limit any rights you may have under consumer protection laws.",
    ],
  },
  {
    title: "9. Changes to These Terms",
    paragraphs: [
      "We may update these Terms from time to time. When we make material changes, we will update the date at the top of this page.",
      "Your continued use of the website after any changes indicates your acceptance of the updated Terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative">
        <div className="relative h-[260px] w-full overflow-hidden sm:h-[320px]">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/70 to-primary/80" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="mx-auto max-w-3xl px-4 text-center text-background">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-background/10">
                <Scale className="h-7 w-7" />
              </div>
              <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Terms of Service
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-background/90 sm:text-lg">
                Please review the terms that apply when you use our website and
                place orders with YeneBakery.
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
                <FileText className="h-3 w-3" />
                <span>Website usage</span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Customer protections</span>
              </div>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <p>
              Please read these Terms of Service carefully before using the
              YeneBakery website or placing an order. If you do not agree with
              these Terms, you should not use this site.
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
              If you have any questions about these Terms or how they apply to
              your order, please contact us through our
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
              For details on how we collect and protect your data, please review
              our
              <Link
                href="/privacy"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {" "}
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
