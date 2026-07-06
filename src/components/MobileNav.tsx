"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const tabs = [
  { href: "/", label: "Tonight", glyph: "◗" },
  { href: "/week", label: "This Week", glyph: "▤" },
  { href: "/sessions", label: "Jams", glyph: "♫" },
  { href: "/map", label: "Map", glyph: "◎" },
];

const overflow = [
  { href: "/my", label: "My Nights" },
  { href: "/browse", label: "Browse" },
  { href: "/calendar", label: "Calendar" },
  { href: "/venues", label: "Venues" },
  { href: "/artists", label: "Artists" },
  { href: "/search", label: "Search" },
  { href: "/submit", label: "Submit" },
  { href: "/about", label: "About" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="btn btn-ghost btn-sm"
      >
        Menu
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-0 top-0 z-50 border-b-2 border-foreground bg-surface p-4">
            <div className="flex items-center justify-between caps">
              <span className="text-muted">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="btn btn-ghost btn-sm"
              >
                Close
              </button>
            </div>
            <nav aria-label="More" className="mt-2 flex flex-col">
              {overflow.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`min-h-12 flex items-center border-b border-line caps ${
                    isActive(item.href) ? "text-accent" : ""
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}

      <nav
        aria-label="Primary"
        className="fixed bottom-0 inset-x-0 z-40 border-t-2 border-foreground bg-surface"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center min-h-14 gap-1 transition-colors ${
                    active ? "text-accent" : "text-foreground"
                  }`}
                >
                  <span aria-hidden className="text-base leading-none">
                    {tab.glyph}
                  </span>
                  <span className="caps">{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
