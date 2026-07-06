import type { Metadata } from "next";

import MyNightsView from "@/components/MyNightsView";

export const metadata: Metadata = {
  title: "My Nights — The Bandstand",
  description: "Your saved Philadelphia jazz shows, rooms, and players — kept on your device.",
  alternates: { canonical: "/my" },
  robots: { index: false },
};

export default async function MyNightsPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;
  return <MyNightsView shareToken={typeof n === "string" ? n : undefined} />;
}
