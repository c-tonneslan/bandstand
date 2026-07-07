// The co-performance graph: who shares a bandstand with whom. Built from the
// performer lists on scraped events — every pair of musicians on the same bill
// is an edge, weighted by how many nights they've shared. This is the Philly
// scene's rhythm-section-recombination structure made visible.

import scraped from "@/data/scraped.json";
import type { ScrapeResult } from "@/scrapers/types";
import { artistSlug } from "./artists";

export interface GraphNode {
  slug: string;
  name: string;
  degree: number; // distinct collaborators
  nights: number; // events they appear on
}

export interface GraphEdge {
  a: string; // slug, a < b
  b: string;
  weight: number; // shared nights
}

export interface SceneGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Collaborator {
  slug: string;
  name: string;
  shared: number;
}

interface ScrapedFile {
  byVenue: Record<string, ScrapeResult>;
}

function allEvents() {
  return Object.values((scraped as ScrapedFile).byVenue).flatMap((v) => v.events);
}

// Canonical display name per slug (first spelling wins), so "Tony Miceli" and a
// stray "tony miceli" collapse to one node.
function buildGraph(): {
  names: Map<string, string>;
  nights: Map<string, number>;
  edges: Map<string, number>;
} {
  const names = new Map<string, string>();
  const nights = new Map<string, number>();
  const edges = new Map<string, number>();

  for (const ev of allEvents()) {
    const performers = ev.performers;
    if (!Array.isArray(performers) || performers.length < 2) continue;

    const slugs = [...new Set(performers.map((p) => artistSlug(p)))];
    performers.forEach((p) => {
      const s = artistSlug(p);
      if (!names.has(s)) names.set(s, p.trim());
    });
    for (const s of slugs) nights.set(s, (nights.get(s) ?? 0) + 1);

    for (let i = 0; i < slugs.length; i++) {
      for (let j = i + 1; j < slugs.length; j++) {
        const [a, b] = [slugs[i], slugs[j]].sort();
        const key = `${a}||${b}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
  }

  return { names, nights, edges };
}

let cached: SceneGraph | null = null;

export function sceneGraph(): SceneGraph {
  if (cached) return cached;
  const { names, nights, edges } = buildGraph();

  const degree = new Map<string, number>();
  const parsedEdges: GraphEdge[] = [];
  for (const [key, weight] of edges) {
    const [a, b] = key.split("||");
    parsedEdges.push({ a, b, weight });
    degree.set(a, (degree.get(a) ?? 0) + 1);
    degree.set(b, (degree.get(b) ?? 0) + 1);
  }

  const nodes: GraphNode[] = [...names].map(([slug, name]) => ({
    slug,
    name,
    degree: degree.get(slug) ?? 0,
    nights: nights.get(slug) ?? 0,
  }));

  nodes.sort((x, y) => y.degree - x.degree || x.name.localeCompare(y.name));
  parsedEdges.sort((x, y) => y.weight - x.weight);

  cached = { nodes, edges: parsedEdges };
  return cached;
}

// Top collaborators for one musician, most-shared first.
export function collaboratorsOf(slug: string): Collaborator[] {
  const { nodes, edges } = sceneGraph();
  const nameOf = new Map(nodes.map((n) => [n.slug, n.name]));
  const out: Collaborator[] = [];
  for (const e of edges) {
    if (e.a === slug && nameOf.has(e.b)) out.push({ slug: e.b, name: nameOf.get(e.b)!, shared: e.weight });
    else if (e.b === slug && nameOf.has(e.a)) out.push({ slug: e.a, name: nameOf.get(e.a)!, shared: e.weight });
  }
  return out.sort((x, y) => y.shared - x.shared || x.name.localeCompare(y.name));
}
