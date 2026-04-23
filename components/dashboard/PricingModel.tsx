"use client";

import { Check, Crown, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { JetBrains_Mono } from "next/font/google";

import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";

interface PricingModelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PricingFeature = {
  label: string;
  included: boolean;
};

type PricingTier = {
  name: "FREE" | "STANDARD" | "PRO";
  price: string;
  description: string;
  ctaLabel: string;
  featured?: boolean;
  features: PricingFeature[];
};

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const PRICING_TIERS: PricingTier[] = [
  {
    name: "FREE",
    price: "\u20b90",
    description: "Perfect for exploring the capabilities.",
    ctaLabel: "Start Free",
    features: [
      { label: "10 Generations / month", included: true },
      { label: "3 Projects", included: true },
      { label: "Frame regeneration", included: false },
      { label: "Team seats", included: false },
    ],
  },
  {
    name: "STANDARD",
    price: "\u20b91,499",
    description: "For dedicated designers and solo devs.",
    ctaLabel: "Upgrade to Standard",
    featured: true,
    features: [
      { label: "100 Generations / month", included: true },
      { label: "Unlimited Projects", included: true },
      { label: "Frame regeneration", included: true },
      { label: "Team seats", included: false },
    ],
  },
  {
    name: "PRO",
    price: "\u20b93,999",
    description: "For scaling teams and agencies.",
    ctaLabel: "Go Pro",
    features: [
      { label: "Unlimited Generations", included: true },
      { label: "Unlimited Projects", included: true },
      { label: "Frame regeneration", included: true },
      { label: "Up to 5 Team seats", included: true },
    ],
  },
];

const PricingModel = ({ open, onOpenChange }: PricingModelProps) => {
  const shouldReduceMotion = useReducedMotion();

  const reveal = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: {
            delay,
            duration: 0.24,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          },
        };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-6xl! border border-border bg-card p-0 text-card-foreground",
          "rounded-sm shadow-2xl shadow-black/40",
        )}
      >
        <motion.div
          className="border-b border-border bg-background/90 px-5 py-4 sm:px-8"
          {...reveal(0.02)}
        >
          <div className="flex items-start gap-3 pr-8">
            <div className="mt-1 shrink-0">
              <Crown className="size-5 text-muted-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
                Upgrade Your Plan
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground sm:text-base">
                Choose a plan that matches your build velocity. Same pricing as
                the landing page, tuned for your dashboard workflow.
              </DialogDescription>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="max-h-[72vh] overflow-y-auto px-5 py-5 sm:px-8 sm:py-8"
          {...reveal(0.06)}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 md:items-stretch">
            {PRICING_TIERS.map((tier) => (
              <motion.article
                key={tier.name}
                className={cn(
                  "relative min-w-0 flex h-full flex-col border border-border bg-background/60 p-5 sm:p-6",
                  tier.featured && "ring-1 ring-primary/50",
                )}
                {...reveal(tier.featured ? 0.12 : 0.1)}
              >
                {tier.featured && (
                  <div className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 border border-border bg-primary px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-primary-foreground uppercase">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <p
                    className={cn(
                      "text-[10px] tracking-[0.2em] text-muted-foreground uppercase",
                      mono.className,
                    )}
                  >
                    {tier.name}
                  </p>

                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-3xl font-black leading-none text-foreground sm:text-4xl">
                      {tier.price}
                    </span>
                    <span className="pb-0.5 text-xs text-muted-foreground">
                      /mo
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </div>

                <ul className="mb-6 flex flex-1 flex-col gap-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature.label}
                      className={cn(
                        "flex items-start gap-2 text-sm",
                        feature.included
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {feature.included ? (
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden
                        />
                      ) : (
                        <X
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground/70"
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 wrap-break-word leading-5">
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <CheckoutButton
                  className={cn(
                    "h-10 w-full rounded-none border",
                    tier.featured
                      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border-border bg-transparent text-foreground hover:bg-muted",
                  )}
                  planId={tier.name}
                  label={tier.ctaLabel}
                />
              </motion.article>
            ))}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModel;
