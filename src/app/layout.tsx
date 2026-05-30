import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import Link from "next/link";

import { lastScrapedAt } from "@/lib/schedule";
import "./globals.css";

function freshnessLabel(iso: string): string {
  if (!iso || iso.startsWith("1970")) return "no scrape yet";
  const ageMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (ageMin < 60) return `last refreshed ${Math.max(ageMin, 1)}m ago`;
  if (ageMin < 60 * 24) return `last refreshed ${Math.round(ageMin / 60)}h ago`;
  return `last refreshed ${Math.round(ageMin / (60 * 24))}d ago`;
}

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
  title: "bandstand — Philly jazz tonight",
  description:
    "What's on tonight in Philly jazz. Gigs, jam sessions, residencies, and the places that host them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const freshness = freshnessLabel(lastScrapedAt());
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${serif.variable}`}>
      <body className="min-h-dvh flex flex-col antialiased">
        <header className="border-b border-line">
          <div className="mx-auto max-w-6xl px-5 py-5 flex items-baseline justify-between gap-6">
            <Link href="/" className="font-serif text-2xl tracking-tight">
              bandstand
              <span className="text-muted text-sm font-sans ml-2">/ philly</span>
            </Link>
            <nav className="flex gap-5 text-sm font-mono uppercase tracking-wider">
              <Link href="/" className="hover:text-brass">
                tonight
              </Link>
              <Link href="/week" className="hover:text-brass">
                this week
              </Link>
              <Link href="/sessions" className="hover:text-brass">
                jam sessions
              </Link>
              <Link href="/venues" className="hover:text-brass">
                venues
              </Link>
              <Link href="/about" className="hover:text-brass hidden md:inline">
                about
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto max-w-6xl w-full px-5 py-10">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl px-5 py-6 flex items-center justify-between text-xs text-muted font-mono">
            <span>built by a listener · {freshness} · check the venue before you go</span>
            <a
              href="https://github.com/c-tonneslan/bandstand"
              className="hover:text-brass"
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
