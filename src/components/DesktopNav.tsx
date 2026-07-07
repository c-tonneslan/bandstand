"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Tonight" },
  { href: "/week", label: "This Week" },
  { href: "/sessions", label: "Jams" },
  { href: "/map", label: "Map" },
  { href: "/browse", label: "Browse" },
  { href: "/calendar", label: "Calendar" },
  { href: "/venues", label: "Venues" },
  { href: "/artists", label: "Artists" },
  { href: "/scene", label: "Scene" },
  { href: "/my", label: "My Nights" },
  { href: "/search", label: "Search" },
  { href: "/submit", label: "Submit" },
  { href: "/about", label: "About" },
];

export default function DesktopNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav aria-label="Primary" className="hidden md:flex flex-wrap gap-x-5 gap-y-2 caps">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`transition-colors ${
              active ? "text-accent underline underline-offset-4" : "hover:text-accent"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
