"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

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

// Visibility is driven by CSS (group-hover / group-focus-within), not JS state, so
// travelling from the trigger down to an item can never race a close timer. The
// panel is a descendant of `.group`, and its `pt-2` bridge sits flush under the
// trigger, so the hover region is continuous. JS only tracks aria + Escape.
function Dropdown({
  group,
  isActive,
}: {
  group: Group;
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const active = group.items.some((item) => isActive(item.href));

  return (
    <div
      className="group relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          (document.activeElement as HTMLElement | null)?.blur();
        }
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`caps inline-flex items-center gap-1 transition-colors ${
          active ? "text-accent underline underline-offset-4" : "hover:text-accent"
        }`}
      >
        {group.label}
        <span
          aria-hidden
          className="transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
        >
          ▾
        </span>
      </button>

      <div
        role="menu"
        aria-label={group.label}
        className="absolute left-0 top-full z-20 hidden min-w-52 pt-2 group-hover:block group-focus-within:block"
      >
        <div className="rounded-[--radius] border border-line bg-surface p-1.5 shadow-[--shadow-card]">
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
      </div>
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
