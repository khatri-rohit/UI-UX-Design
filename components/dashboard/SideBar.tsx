/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  HelpCircle,
  CalendarDays,
  FolderKanban,
  History,
  LucideIcon,
  X,
} from "lucide-react";
import { JetBrains_Mono } from "next/font/google";
import { Button } from "@/components/ui/button";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])";

const navItems: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Recent", icon: History },
  { label: "Yesterday", icon: CalendarDays },
  { label: "Last 30 Days", icon: CalendarDays },
  { label: "Examples", icon: FolderKanban },
];

const projectFeed: Array<{ name: string; time: string; detail: string }> = [
  {
    name: "CORE_ENGINE_V1",
    time: "08:42",
    detail: "Optimizing shader passes...",
  },
  {
    name: "UI_SCAFFOLD_PROTOTYPE",
    time: "YEST",
    detail: "Refactoring flexbox grid...",
  },
  {
    name: "DATA_VIZ_EXPERIMENTAL",
    time: "12.04",
    detail: "Canvas API implementation",
  },
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
  const shouldReduceMotion = useReducedMotion();
  const mobileDrawerRef = useRef<HTMLElement | null>(null);

  const [activeNavItem, setActiveNavItem] = useState(
    navItems[0]?.label ?? "Recent",
  );
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
        className="logic-sidebar hidden w-64 shrink-0 border-r border-border bg-background md:flex"
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
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setActiveNavItem(item.label)}
                    aria-current={
                      activeNavItem === item.label ? "page" : undefined
                    }
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 text-left transition-colors duration-75",
                      activeNavItem === item.label
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
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-8 flex flex-1 flex-col gap-4 px-4">
            {projectFeed.map((project, index) => (
              <motion.button
                key={project.name}
                type="button"
                className="logic-feed-item border border-border p-3 text-left transition-colors hover:border-muted-foreground"
                {...fadeLeft(0.12 + index * 0.04)}
              >
                <div className="mb-1 flex items-start justify-between gap-3">
                  <span className="truncate text-xs font-bold">
                    {project.name}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] text-muted-foreground",
                      mono.className,
                    )}
                  >
                    {project.time}
                  </span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {project.detail}
                </p>
              </motion.button>
            ))}
          </div>

          <div className="mt-auto border-t border-border px-4 pt-6">
            {/* <Select value="" onValueChange={handleSettingsSelect}>
                <SelectTrigger
                  className={cn(
                    "h-9 w-full text-[10px] uppercase tracking-[0.16em] border-border bg-card/70 text-muted-foreground hover:text-foreground transition-colors",
                    mono.className,
                  )}
                >
                  <Settings className="size-4" data-icon="inline-start" />
                  <SelectValue placeholder="Settings" />
                </SelectTrigger>

                <SelectContent
                  position="popper"
                  side="top"
                  align="end"
                  sideOffset={8}
                  className={cn(
                    "dark mt-0! max-w-55! rounded-none! border! border-border! bg-background! p-0! text-foreground! ring-0! shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_16px_32px_-18px_rgba(0,0,0,0.9)]!",
                    mono.className,
                  )}
                >
                  <SelectGroup className="scroll-my-0! p-0!">
                    {[
                      { value: "profile", label: "Profile" },
                      { value: "settings", label: "Settings" },
                      { value: "support", label: "Support" },
                      {
                        value: "logout",
                        label: isSigningOut ? "Signing out..." : "Logout",
                        disabled: isSigningOut,
                      },
                    ].map((item) => (
                      <SelectItem
                        key={item.value}
                        value={item.value}
                        disabled={item.disabled}
                        className={cn(
                          "relative! h-9! cursor-pointer! rounded-none! border-b! border-border! px-3! py-0! text-[10px]! uppercase! tracking-[0.16em]! text-muted-foreground! outline-none!",
                          "last:border-b-0! data-highlighted:bg-muted! data-highlighted:text-foreground! data-[state=checked]:text-foreground!",
                          mono.className,
                          item.value === "logout" &&
                            "text-destructive! data-highlighted:bg-destructive/10! data-highlighted:text-destructive!",
                        )}
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select> */}
            <button
              type="button"
              className="mt-1 flex w-full items-center gap-3 px-4 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
            </button>
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
                        setActiveNavItem(item.label);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-left",
                        activeNavItem === item.label
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
                {projectFeed.map((project) => (
                  <button
                    key={`mobile-feed-${project.name}`}
                    type="button"
                    className="mb-2 flex w-full flex-col border border-border p-3 text-left"
                  >
                    <span className="truncate text-xs font-bold">
                      {project.name}
                    </span>
                    <span
                      className={cn(
                        "mt-1 text-[10px] text-muted-foreground",
                        mono.className,
                      )}
                    >
                      {project.time} - {project.detail}
                    </span>
                  </button>
                ))}
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default SideBar;
