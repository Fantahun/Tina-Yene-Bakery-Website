"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin, Phone, Mail, Clock, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

const contactInfo = [
  // {
  //   icon: MapPin,
  //   label: "Visit Us",
  //   // lines: ["when needed we will put our address here"],
  // },
  {
    icon: Phone,
    label: "Call Us",
    lines: ["(425) 312-3140"],
  },
  {
    icon: Mail,
    label: "Email Us",
    lines: ["hello@YeneBakery.com"],
  },
  {
    icon: Clock,
    label: "Hours",
    lines: ["Mon-Fri: 7am - 7pm", "Saturday: 8am - 6pm", "Sunday: 8am - 4pm"],
  },
];

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details && Array.isArray(result.details)) {
          // It's a validation error
          result.details.forEach((err: any) => {
            toast.error(`${err.path.join('.')}: ${err.message}`);
          });
          return; // Stop submission
        } else if (result.error) {
           throw new Error(result.error);
        }
        throw new Error("Failed to send message");
      }

      toast.success("Message sent! We'll get back to you within 24 hours.");
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again later.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative">
        <div className="relative h-[300px] w-full overflow-hidden sm:h-[360px]">
          <Image
            src="/images/bakery-storefront.jpg"
            alt="YeneBakery storefront"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-foreground/50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="mx-auto max-w-3xl px-4 text-center">
              <h1 className="text-balance text-3xl font-bold tracking-tight text-background sm:text-4xl lg:text-5xl">
                Contact Us
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-background/90 sm:text-lg">
                Have a question, special request, or just want to say hello? We
                would love to hear from you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5 lg:gap-16">
          {/* Contact Info */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Get in Touch
            </h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Whether it is a custom cake inquiry, a catering request, or
              feedback on your last order, we are here to help.
            </p>

            <Separator className="my-8" />

            <div className="space-y-6">
              {contactInfo.map((info) => {
                const Icon = info.icon;
                return (
                  <div key={info.label} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {info.label}
                      </h3>
                      {info.lines.map((line) => (
                        <p
                          key={line}
                          className="text-sm leading-relaxed text-muted-foreground"
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-card-foreground">
                Send Us a Message
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Fill out the form below and we will respond within 24 hours.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Full Name</Label>
                    <Input
                      id="contact-name"
                      name="name"
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      name="email"
                      type="email"
                      placeholder="jane@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-phone">
                    Phone Number{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    placeholder="(425) 312-3140"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-subject">Subject</Label>
                  <Input
                    id="contact-subject"
                    name="subject"
                    placeholder="Custom cake inquiry, catering, feedback..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea
                    id="contact-message"
                    name="message"
                    placeholder="Tell us how we can help..."
                    rows={5}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
