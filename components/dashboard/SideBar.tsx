/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { HelpCircle, CalendarDays, History, LucideIcon, X } from "lucide-react";
import { JetBrains_Mono } from "next/font/google";
import { Button } from "@/components/ui/button";
import { useProjectsQuery } from "@/lib/projects/queries";
import { useUserActivityStore } from "@/providers/zustand-provider";
import { Timeframe } from "@/stores/user-activity";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])";

const navItems: Array<{ label: Timeframe; icon: LucideIcon }> = [
  { label: "Recent", icon: History },
  { label: "Yesterday", icon: CalendarDays },
  { label: "Last 7 Days", icon: CalendarDays },
  { label: "Last 30 Days", icon: CalendarDays },
  // { label: "Examples", icon: FolderKanban },
];

interface SidebarProps {
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  isMobileMenuOpen: boolean;
  launcherButtonRef: React.RefObject<HTMLButtonElement | null>;
}

const SideBar = ({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  launcherButtonRef,
}: SidebarProps) => {
  const selectedTimeframe = useUserActivityStore(
    (state) => state.selectedTimeframe,
  );
  const setSelectedTimeframe = useUserActivityStore(
    (state) => state.setSelectedTimeframe,
  );

  const shouldReduceMotion = useReducedMotion();
  const mobileDrawerRef = useRef<HTMLElement | null>(null);

  const fadeLeft = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, x: -24 },
          animate: { opacity: 1, x: 0 },
          transition: {
            delay,
            duration: 0.26,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          },
        };

  const { data: projects = [] } = useProjectsQuery();
  const filteredNavItems = useMemo(() => {
    if (projects.length === 0) {
      return [];
    }

    const now = Date.now();
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date(now);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const recentCutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const weekCutoff = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    return projects.filter((item) => {
      if (selectedTimeframe === "Recent") {
        return item.updatedAt >= recentCutoff;
      }

      if (selectedTimeframe === "Yesterday") {
        return (
          item.updatedAt >= yesterdayStart.toISOString() &&
          item.updatedAt <= yesterdayEnd.toISOString()
        );
      }

      if (selectedTimeframe === "Last 7 Days") {
        return (
          item.updatedAt <= yesterdayEnd.toISOString() &&
          item.updatedAt >= weekCutoff
        );
      }

      return item.updatedAt >= monthCutoff;
    });
  }, [projects, selectedTimeframe]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const fallbackLauncher = launcherButtonRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = mobileDrawerRef.current;

    const getFocusableElements = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );

    const focusable = getFocusableElements();
    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsMobileMenuOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const currentFocusable = getFocusableElements();
      if (currentFocusable.length === 0) {
        return;
      }

      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused) {
        previouslyFocused.focus();
        return;
      }

      fallbackLauncher?.focus();
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <motion.aside
        className="logic-sidebar hidden max-w-64 min-w-64 pt-14 shrink-0 border-r border-border bg-background md:flex w-full"
        {...fadeLeft(0.06)}
      >
        <div className="flex h-full flex-col py-6">
          <div className="px-4">
            <p
              className={cn(
                "px-2 text-[11px] tracking-[0.22em] text-muted-foreground",
                mono.className,
              )}
            >
              PROJECTS
            </p>

            <nav className="mt-4 flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <motion.button
                    key={item.label}
                    type="button"
                    onClick={() => setSelectedTimeframe(item.label)}
                    aria-current={
                      selectedTimeframe === item.label ? "page" : undefined
                    }
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 text-left transition-colors duration-75",
                      selectedTimeframe === item.label
                        ? "border-l-4 border-primary bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    <span
                      className={cn(
                        "text-[11px] uppercase tracking-[0.16em]",
                        mono.className,
                      )}
                    >
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}
            </nav>
          </div>

          <div className="mt-8 flex flex-1 flex-col gap-4 px-4 max-w-64 min-w-64">
            {filteredNavItems.map((project, index) => (
              <motion.button
                key={project.id}
                type="button"
                className="logic-feed-item border border-border p-3 text-left transition-colors hover:border-muted-foreground"
                {...fadeLeft(0.12 + index * 0.04)}
              >
                <div className="mb-1 flex items-start justify-between gap-3">
                  <span className="truncate text-xs font-bold">
                    {project.title}
                  </span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground text-ellipsis">
                  {project.description}
                </p>
              </motion.button>
            ))}
            {filteredNavItems.length === 0 && (
              <div
                className={cn(
                  "text-[11px] text-muted-foreground px-3 leading-4 text-pretty",
                  mono.className,
                )}
              >
                No projects found for the selected timeframe.
              </div>
            )}
          </div>

          <div className="mt-auto border-t border-border px-4 pt-6">
            <motion.button
              type="button"
              className="flex w-full items-center gap-3 px-4 pl-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HelpCircle className="size-4" />
              <span
                className={cn(
                  "text-[11px] tracking-[0.16em] uppercase",
                  mono.className,
                )}
              >
                Support
              </span>
            </motion.button>
          </div>
        </div>
      </motion.aside>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <motion.div
            className="md:hidden flex fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close navigation menu backdrop"
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 border-0 bg-black/60 p-0 transition-none hover:bg-black/60"
            />

            <motion.aside
              ref={mobileDrawerRef}
              className="absolute right-0 top-0 flex h-full w-[85vw] max-w-sm flex-col border-l border-border bg-background"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <span
                  className={cn(
                    "text-[11px] uppercase tracking-[0.18em]",
                    mono.className,
                  )}
                >
                  Navigation
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close navigation menu"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X />
                </Button>
              </div>

              <nav className="flex flex-col gap-1 px-3 py-4">
                {navItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={`mobile-${item.label}`}
                      type="button"
                      onClick={() => {
                        setSelectedTimeframe(item.label);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-left",
                        selectedTimeframe === item.label
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      <span
                        className={cn(
                          "text-[11px] uppercase tracking-[0.16em]",
                          mono.className,
                        )}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-border px-3 py-4">
                {filteredNavItems.map((project) => (
                  <button
                    key={`mobile-feed-${project.id}`}
                    type="button"
                    className="mb-2 flex w-full flex-col border border-border p-3 text-left"
                  >
                    <span className="truncate text-xs font-bold">
                      {project.title}
                    </span>
                    <span
                      className={cn(
                        "mt-1 text-[10px] text-muted-foreground",
                        mono.className,
                      )}
                    >
                      {new Date().toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      - {project.description}
                    </span>
                  </button>
                ))}
                {filteredNavItems.length === 0 && (
                  <div
                    className={cn(
                      "px-1 text-[11px] leading-4 text-muted-foreground",
                      mono.className,
                    )}
                  >
                    No projects found for the selected timeframe.
                  </div>
                )}
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default SideBar;
