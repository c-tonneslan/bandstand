import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono, Fraunces } from "next/font/google";
import Link from "next/link";

import DesktopNav from "@/components/DesktopNav";
import MobileNav from "@/components/MobileNav";
import ThemeToggle from "@/components/ThemeToggle";
import { lastScrapedAt } from "@/lib/schedule";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bandstand-bay.vercel.app"),
  title: "The Bandstand — Philly jazz, tonight",
  description:
    "What's on tonight in Philly jazz. Live rooms, jam sessions, listening rooms, vinyl bars, DJ nights, and the spots that play real jazz on the system.",
  openGraph: {
    title: "The Bandstand — Philly jazz, tonight",
    description:
      "Where to hear jazz in Philadelphia tonight and this week. Hand-curated and scraped from twelve different venue calendars.",
    type: "website",
    url: "/",
    siteName: "The Bandstand",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Bandstand — Philly jazz, tonight",
    description: "Where to hear jazz in Philadelphia tonight and this week.",
  },
};

// Applies the persisted theme (or a nocturnal default) before paint, no FOUC.
const themeScript = `(function(){try{var t=localStorage.theme;if(t!=="dark"&&t!=="light"){var h=new Date().toLocaleString("en-US",{timeZone:"America/New_York",hour:"numeric",hour12:false});h=parseInt(h,10);t=(h>=20||h<6)?"dark":"light";}if(t==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`;

function freshnessLabel(iso: string): string {
  if (!iso || iso.startsWith("1970")) return "no scrape yet";
  const ageMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (ageMin < 60) return `${Math.max(ageMin, 1)}m`;
  if (ageMin < 60 * 24) return `${Math.round(ageMin / 60)}h`;
  return `${Math.round(ageMin / (60 * 24))}d`;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fresh = freshnessLabel(lastScrapedAt());
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh flex flex-col antialiased relative">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:p-3 focus:bg-surface focus:outline focus:outline-2 focus:outline-foreground"
        >
          Skip to content
        </a>
        <div className="grain" aria-hidden />

        <header className="relative z-30 border-b-2 border-foreground">
          <div className="border-b border-foreground/25 px-6 md:px-10 py-3 flex items-center justify-between gap-4 caps">
            <Link href="/" className="hover:underline underline-offset-4">
              /the-bandstand
            </Link>
            <span className="text-accent font-medium hidden sm:inline">
              ★ Philadelphia · A weekly
            </span>
            <div className="flex items-center gap-3 ml-auto">
              <span className="hidden md:block">last refresh · {fresh}</span>
              <ThemeToggle />
              <MobileNav />
            </div>
          </div>
          <div className="px-6 md:px-10 pt-8 md:pt-10 pb-4 flex items-baseline justify-between gap-4 flex-wrap">
            <Link href="/" className="masthead text-5xl md:text-7xl">
              The Bandstand.
            </Link>
            <DesktopNav />
          </div>
        </header>

        <main
          id="main"
          className="relative z-10 flex-1 mx-auto max-w-6xl w-full px-6 md:px-10 py-10 md:py-14 pb-24 md:pb-14"
        >
          {children}
        </main>

        <footer className="relative z-10 border-t-2 border-foreground">
          <div className="mx-auto max-w-6xl px-6 md:px-10 py-6 flex items-center justify-between caps text-muted flex-wrap gap-2">
            <span>Built by a listener · hand-curated + scraped · check the venue before you go</span>
            <div className="flex items-center gap-4">
              <Link href="/submit" className="hover:text-accent">
                submit
              </Link>
              <Link href="/about" className="hover:text-accent">
                about
              </Link>
              <a
                href="https://github.com/c-tonneslan/bandstand"
                className="hover:text-accent"
                target="_blank"
                rel="noreferrer"
              >
                github
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
