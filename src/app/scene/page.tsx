import type { Metadata } from "next";
import Link from "next/link";

import SceneGraph from "@/components/SceneGraph";
import { sceneGraph } from "@/lib/graph";

export const metadata: Metadata = {
  title: "The Scene — The Bandstand",
  description:
    "A map of the Philadelphia jazz scene by who shares a bandstand with whom. Every line is a night two players stood on the same stage.",
  alternates: { canonical: "/scene" },
  openGraph: {
    title: "The Scene — The Bandstand",
    description:
      "Who shares a bandstand with whom across the Philadelphia jazz scene.",
    url: "/scene",
    type: "website",
    siteName: "The Bandstand",
  },
};

export default function ScenePage() {
  const { nodes, edges } = sceneGraph();
  const hubs = nodes.slice(0, 10);

  return (
    <div>
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps mb-3">Who plays with whom</p>
          <h1 className="masthead text-[clamp(3rem,9vw,6rem)]">The Scene.</h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>{nodes.length} players,</p>
          <p>{edges.length} shared bills,</p>
          <p>one rhythm section.</p>
        </div>
      </header>

      <p className="deck max-w-3xl mt-8 mb-8">
        Who shares a bandstand with whom. Every line is a night two players were on
        the same stand — the scene&rsquo;s rhythm-section recombination, made visible.
      </p>

      <SceneGraph nodes={nodes} edges={edges} />

      <p className="text-xs text-muted caps mt-3">
        Bigger dot = more collaborators. Hover a player to light up who they play
        with; tap or click through to their page.
      </p>

      <section className="mt-14">
        <h2 className="caps text-accent mb-4 border-b border-foreground/30 pb-2">
          The biggest hubs
        </h2>
        <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
          {hubs.map((n, i) => (
            <li key={n.slug} className="flex items-baseline gap-3 border-b border-line py-2">
              <span className="caps text-muted tnum w-6 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Link href={`/artists/${n.slug}`} className="font-serif text-xl hover:text-accent">
                {n.name}
              </Link>
              <span className="caps text-muted ml-auto shrink-0">
                {n.degree} collaborator{n.degree === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
