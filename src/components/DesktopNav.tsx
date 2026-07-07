"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Leaf = { href: string; label: string };
type Group = { label: string; items: Leaf[] };

const tonight: Leaf = { href: "/", label: "Tonight" };
const week: Leaf = { href: "/week", label: "This Week" };

const discover: Group = {
  label: "Discover",
  items: [
    { href: "/new", label: "Just Announced" },
    { href: "/browse", label: "Browse" },
    { href: "/calendar", label: "Calendar" },
    { href: "/map", label: "Map" },
    { href: "/scene", label: "Scene" },
  ],
};

const rooms: Group = {
  label: "Rooms & Players",
  items: [
    { href: "/venues", label: "Venues" },
    { href: "/artists", label: "Artists" },
    { href: "/residencies", label: "Residencies" },
    { href: "/sessions", label: "Jams" },
  ],
};

const my: Leaf = { href: "/my", label: "My Nights" };
const search: Leaf = { href: "/search", label: "Search" };

function useIsActive() {
  const pathname = usePathname();
  return useCallback(
    (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href)),
    [pathname],
  );
}

function NavLink({ href, label, active }: Leaf & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`transition-colors ${
        active ? "text-accent underline underline-offset-4" : "hover:text-accent"
      }`}
    >
      {label}
    </Link>
  );
}

function Dropdown({
  group,
  isActive,
}: {
  group: Group;
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const active = group.items.some((item) => isActive(item.href));

  // Close on route change (adjust state during render, no effect needed).
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  // Close on click/tap outside the group.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!groupRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const closeAndRefocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={groupRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!groupRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          closeAndRefocus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`caps inline-flex items-center gap-1 transition-colors ${
          active ? "text-accent underline underline-offset-4" : "hover:text-accent"
        }`}
      >
        {group.label}
        <span aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={group.label}
          className="absolute left-0 top-full z-20 mt-2 min-w-52 rounded-[--radius] border border-line bg-surface p-1.5 shadow-[--shadow-card]"
        >
          {group.items.map((item) => {
            const itemActive = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={itemActive ? "page" : undefined}
                className={`caps flex min-h-10 items-center rounded-[--radius] px-3 transition-colors ${
                  itemActive
                    ? "text-accent"
                    : "hover:bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] hover:text-accent"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DesktopNav() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="Primary"
      className="hidden md:flex flex-wrap items-center gap-x-5 gap-y-2 caps"
    >
      <NavLink {...tonight} active={isActive(tonight.href)} />
      <NavLink {...week} active={isActive(week.href)} />
      <Dropdown group={discover} isActive={isActive} />
      <Dropdown group={rooms} isActive={isActive} />
      <NavLink {...my} active={isActive(my.href)} />
      <NavLink {...search} active={isActive(search.href)} />
    </nav>
  );
}
