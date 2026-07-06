import type { MetadataRoute } from "next";

import { venues } from "@/data/venues";
import { listArtists } from "@/lib/artists";

const BASE = "https://bandstand-bay.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: {
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }[] = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/week", changeFrequency: "daily", priority: 0.9 },
    { path: "/sessions", changeFrequency: "daily", priority: 0.8 },
    { path: "/map", changeFrequency: "weekly", priority: 0.7 },
    { path: "/venues", changeFrequency: "weekly", priority: 0.7 },
    { path: "/artists", changeFrequency: "daily", priority: 0.6 },
    { path: "/search", changeFrequency: "monthly", priority: 0.4 },
    { path: "/submit", changeFrequency: "monthly", priority: 0.3 },
    { path: "/about", changeFrequency: "monthly", priority: 0.3 },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const venueEntries: MetadataRoute.Sitemap = venues.map((v) => ({
    url: `${BASE}/venues/${v.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const artistEntries: MetadataRoute.Sitemap = listArtists().map((a) => ({
    url: `${BASE}/artists/${a.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [...staticEntries, ...venueEntries, ...artistEntries];
}
