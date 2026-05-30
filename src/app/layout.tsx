import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import Link from "next/link";

import { lastScrapedAt } from "@/lib/schedule";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Bandstand — Philly jazz, tonight",
  description:
    "What's on tonight in Philly jazz. Live rooms, jam sessions, listening rooms, vinyl bars, DJ nights, and the spots that play real jazz on the system.",
};

function freshnessLabel(iso: string): string {
  if (!iso || iso.startsWith("1970")) return "no scrape yet";
  const ageMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (ageMin < 60) return `${Math.max(ageMin, 1)}m`;
  if (ageMin < 60 * 24) return `${Math.round(ageMin / 60)}h`;
  return `${Math.round(ageMin / (60 * 24))}d`;
}

const navItems = [
  { href: "/", label: "Tonight" },
  { href: "/week", label: "This Week" },
  { href: "/sessions", label: "Jams" },
  { href: "/map", label: "Map" },
  { href: "/venues", label: "Venues" },
  { href: "/about", label: "About" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fresh = freshnessLabel(lastScrapedAt());
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${serif.variable}`}>
      <body className="min-h-dvh flex flex-col antialiased relative">
        <div className="grain" aria-hidden />

        <header className="relative z-10 border-b-2 border-foreground">
          <div className="border-b border-foreground/25 px-6 md:px-10 py-3 flex items-center justify-between caps">
            <Link href="/" className="hover:underline underline-offset-4">
              /the-bandstand
            </Link>
            <span className="text-red font-medium hidden sm:inline">
              ★ Philadelphia · A weekly
            </span>
            <span className="hidden md:block">last refresh · {fresh}</span>
          </div>
          <div className="px-6 md:px-10 pt-8 md:pt-10 pb-4 flex items-baseline justify-between gap-4 flex-wrap">
            <Link href="/" className="font-serif italic text-5xl md:text-7xl leading-none tracking-tight">
              The Bandstand.
            </Link>
            <nav className="flex flex-wrap gap-x-5 gap-y-2 caps">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-red">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="relative z-10 flex-1 mx-auto max-w-6xl w-full px-6 md:px-10 py-10 md:py-14">
          {children}
        </main>

        <footer className="relative z-10 border-t-2 border-foreground">
          <div className="mx-auto max-w-6xl px-6 md:px-10 py-6 flex items-center justify-between caps text-muted flex-wrap gap-2">
            <span>Built by a listener · hand-curated + scraped · check the venue before you go</span>
            <a
              href="https://github.com/c-tonneslan/bandstand"
              className="hover:text-red"
              target="_blank"
              rel="noreferrer"
            >
              github
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
