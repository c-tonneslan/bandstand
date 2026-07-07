// Build-time artist enrichment. Occasionally-run, network-heavy: resolve each
// performer to a MusicBrainz artist, follow its relation links to Wikipedia /
// Spotify / socials, and write src/data/artists-enriched.json for the build to
// read offline. NOT wired into prebuild — run by hand with `npx tsx`.
//
// Sources & licensing: MusicBrainz + Wikidata are CC0; Wikipedia extracts and
// Commons images are CC BY-SA 4.0 (we store the attribution strings the UI
// renders). We never rehost images — the URL is hotlinked.

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { listArtists } from "../src/lib/artists";
import { artistMbidOverrides } from "../src/data/artist-mbid-overrides";
import type { EnrichedArtist, EnrichedArtistLink, EnrichedArtistPhoto } from "../src/lib/enriched";

const OUT_PATH = join(import.meta.dirname, "..", "src", "data", "artists-enriched.json");
const USER_AGENT = "bandstand/1.0 (https://bandstand-bay.vercel.app)";
const MB_SCORE_THRESHOLD = 90;
const BIO_MAX = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
}

// ---- MusicBrainz shapes (only the fields we touch) ---------------------------

interface MbSearchArtist {
  id: string;
  name: string;
  score: number;
  type?: string;
  area?: { name?: string };
  "begin-area"?: { name?: string };
  tags?: { name: string; count: number }[];
}
interface MbSearchResult {
  artists?: MbSearchArtist[];
}
interface MbRelation {
  type: string;
  url?: { resource: string };
}
interface MbArtist {
  id: string;
  name: string;
  type?: string;
  area?: { name?: string };
  "begin-area"?: { name?: string };
  relations?: MbRelation[];
  tags?: { name: string; count: number }[];
  genres?: { name: string; count: number }[];
}

interface WikidataEntity {
  entities?: Record<string, { sitelinks?: { enwiki?: { title?: string } } }>;
}

interface WikiSummary {
  type?: string; // "standard" | "disambiguation" | ...
  title?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
}

function normTokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// MusicBrainz scores a single-token hit at ~100 ("Bill Saurman" -> "Bill
// Evans"), so score alone lets wrong people through. Gate on the name: the
// surname must actually match (allowing "Alex" -> "Alexander"), and enough of
// the query's tokens must appear. This kills the disambiguation false matches.
function nameMatches(query: string, candidate: string): boolean {
  const q = normTokens(query);
  const c = normTokens(candidate);
  if (q.length === 0 || c.length === 0) return false;

  const tokenHit = (qt: string) =>
    c.some((ct) => ct === qt || ct.startsWith(qt) || qt.startsWith(ct));

  const surname = q[q.length - 1];
  if (!tokenHit(surname)) return false; // last name must be present

  const hits = q.filter(tokenHit).length;
  return hits >= q.length; // every query token must land somewhere
}

// A search candidate looks right if MB is confident, the name genuinely
// matches, and the type isn't off-domain. We bias toward US/Philadelphia + jazz.
function candidateLooksRight(query: string, c: MbSearchArtist): boolean {
  if (c.score < MB_SCORE_THRESHOLD) return false;
  if (c.type && c.type !== "Person" && c.type !== "Group") return false;
  if (!nameMatches(query, c.name)) return false;
  return true;
}

function scoreBoost(c: MbSearchArtist): number {
  let boost = 0;
  const area = `${c.area?.name ?? ""} ${c["begin-area"]?.name ?? ""}`.toLowerCase();
  if (area.includes("philadelphia") || area.includes("united states")) boost += 5;
  const tags = (c.tags ?? []).map((t) => t.name.toLowerCase());
  if (tags.some((t) => t.includes("jazz"))) boost += 10;
  return boost;
}

function pickCandidate(query: string, candidates: MbSearchArtist[]): MbSearchArtist | null {
  const viable = candidates.filter((c) => candidateLooksRight(query, c));
  if (viable.length === 0) return null;
  // Rank by MB score + our domain boost; MB already sorts by score, so this
  // only reshuffles when a jazz/US match sits just behind a higher raw score.
  viable.sort((a, b) => b.score + scoreBoost(b) - (a.score + scoreBoost(a)));
  return viable[0];
}

const REL_LABELS: Record<string, string> = {
  bandcamp: "Bandcamp",
  discogs: "Discogs",
  "official homepage": "Homepage",
};

function socialLabel(url: string): string | null {
  const u = url.toLowerCase();
  if (u.includes("instagram.com")) return "Instagram";
  if (u.includes("facebook.com")) return "Facebook";
  if (u.includes("twitter.com") || u.includes("x.com")) return "Twitter";
  if (u.includes("youtube.com")) return "YouTube";
  if (u.includes("soundcloud.com")) return "SoundCloud";
  return null;
}

interface RelData {
  wikidataUrl?: string;
  wikipediaUrl?: string;
  spotifyId?: string;
  links: EnrichedArtistLink[];
}

function collectRelations(relations: MbRelation[] = []): RelData {
  const out: RelData = { links: [] };
  const seen = new Set<string>();
  const add = (label: string, url: string) => {
    if (seen.has(label)) return;
    seen.add(label);
    out.links.push({ label, url });
  };

  for (const rel of relations) {
    const url = rel.url?.resource;
    if (!url) continue;
    const type = rel.type.toLowerCase();

    if (type === "wikidata") out.wikidataUrl = url;
    if (type === "wikipedia") {
      out.wikipediaUrl = url;
      add("Wikipedia", url);
    }
    if (url.includes("open.spotify.com/artist/")) {
      const m = url.match(/\/artist\/([A-Za-z0-9]+)/);
      if (m) out.spotifyId = m[1];
    }
    const known = REL_LABELS[type];
    if (known) add(known, url);
    const social = socialLabel(url);
    if (social) add(social, url);
  }
  return out;
}

// Wikipedia title from a wiki URL: last path segment, decoded.
function wikiTitle(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const seg = path.split("/").filter(Boolean).pop();
    return seg ? decodeURIComponent(seg) : null;
  } catch {
    return null;
  }
}

// Resolve a Wikidata entity URL to its exact enwiki page title. Preferred over
// the raw MB wikipedia relation because it never lands on a disambiguation page.
async function wikipediaTitleFromWikidata(wikidataUrl: string): Promise<string | null> {
  const id = wikiTitle(wikidataUrl); // Q-number is the last path segment
  if (!id || !/^Q\d+$/.test(id)) return null;
  const data = await getJson<WikidataEntity>(
    `https://www.wikidata.org/wiki/Special:EntityData/${id}.json`,
  );
  return data.entities?.[id]?.sitelinks?.enwiki?.title ?? null;
}

function trimBio(extract: string): string {
  if (extract.length <= BIO_MAX) return extract.trim();
  // Cut to the last sentence boundary within the budget, else hard-trim.
  const slice = extract.slice(0, BIO_MAX);
  const lastStop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  return (lastStop > 120 ? slice.slice(0, lastStop + 1) : slice.trimEnd() + "…").trim();
}

function genresFrom(a: MbArtist): string[] {
  const src = a.genres?.length ? a.genres : a.tags ?? [];
  return src
    .filter((g) => g.count === undefined || g.count > 0)
    .sort((x, y) => (y.count ?? 0) - (x.count ?? 0))
    .slice(0, 5)
    .map((g) => g.name);
}

function hometownFrom(a: MbArtist): string | undefined {
  return a["begin-area"]?.name ?? a.area?.name ?? undefined;
}

async function fetchWikiSummary(title: string): Promise<{
  bio?: string;
  bioSource?: { title: string; url: string; license: string };
  photo?: EnrichedArtistPhoto;
}> {
  const api = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const s = await getJson<WikiSummary>(api);
  const page = s.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
  // Disambiguation / list pages have no real bio — don't attach.
  if (s.type === "disambiguation") return {};
  const out: Awaited<ReturnType<typeof fetchWikiSummary>> = {};
  if (s.extract) {
    out.bio = trimBio(s.extract);
    out.bioSource = { title: s.title ?? title.replace(/_/g, " "), url: page, license: "CC BY-SA 4.0" };
  }
  const img = s.thumbnail?.source ?? s.originalimage?.source;
  if (img) {
    out.photo = { url: img, license: "CC BY-SA 4.0", sourceUrl: page, credit: "Wikimedia Commons" };
  }
  return out;
}

async function enrichOne(slug: string, name: string): Promise<EnrichedArtist> {
  const base: EnrichedArtist = { slug, name, resolvedAt: new Date().toISOString() };

  // 1. Resolve MBID: override wins, else MusicBrainz search (throttled by caller).
  let mbid: string | undefined;
  let confidence: EnrichedArtist["confidence"];

  if (Object.prototype.hasOwnProperty.call(artistMbidOverrides, slug)) {
    const forced = artistMbidOverrides[slug];
    if (forced === null) {
      return { ...base, confidence: "override" }; // curator said skip
    }
    mbid = forced;
    confidence = "override";
  } else {
    const q = encodeURIComponent(name);
    const search = await getJson<MbSearchResult>(
      `https://musicbrainz.org/ws/2/artist?query=${q}&fmt=json&limit=8`,
    );
    const pick = pickCandidate(name, search.artists ?? []);
    await sleep(1100); // 1 req/sec hard limit
    if (!pick) return { ...base, confidence: "low" };
    mbid = pick.id;
    confidence = "high";
  }

  base.mbid = mbid;
  base.confidence = confidence;

  // 2. Follow the MBID's relations (never name-search downstream).
  const artist = await getJson<MbArtist>(
    `https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels+tags+genres&fmt=json`,
  );
  await sleep(1100);

  const rel = collectRelations(artist.relations);
  if (rel.spotifyId) base.spotifyId = rel.spotifyId;
  if (rel.links.length) base.links = rel.links;

  const genres = genresFrom(artist);
  if (genres.length) base.genres = genres;
  const hometown = hometownFrom(artist);
  if (hometown) base.hometown = hometown;

  // 3. Bio + photo from Wikipedia. Prefer the Wikidata->enwiki sitelink (exact
  // page, no disambiguation); fall back to the raw MB wikipedia relation.
  let wikiTitleToFetch: string | null = null;
  if (rel.wikidataUrl) {
    try {
      wikiTitleToFetch = await wikipediaTitleFromWikidata(rel.wikidataUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ! wikidata resolve failed: ${msg}`);
    }
  }
  if (!wikiTitleToFetch && rel.wikipediaUrl) {
    wikiTitleToFetch = wikiTitle(rel.wikipediaUrl);
    if (!base.links?.some((l) => l.label === "Wikipedia")) {
      base.links = [...(base.links ?? []), { label: "Wikipedia", url: rel.wikipediaUrl }];
    }
  }
  if (wikiTitleToFetch) {
    try {
      const wiki = await fetchWikiSummary(wikiTitleToFetch);
      if (wiki.bio) base.bio = wiki.bio;
      if (wiki.bioSource) base.bioSource = wiki.bioSource;
      if (wiki.photo) base.photo = wiki.photo;
      // Ensure a Wikipedia outbound link exists when we resolved via Wikidata.
      if (wiki.bioSource && !base.links?.some((l) => l.label === "Wikipedia")) {
        base.links = [...(base.links ?? []), { label: "Wikipedia", url: wiki.bioSource.url }];
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ! wiki summary failed: ${msg}`);
    }
  }

  return base;
}

async function main() {
  const artists = listArtists();
  const out: Record<string, EnrichedArtist> = {};
  let high = 0;
  let low = 0;
  let override = 0;

  console.log(`enriching ${artists.length} artists (throttled 1 req/sec)...`);

  for (const { slug, name } of artists) {
    process.stdout.write(`  ${name} ... `);
    try {
      const enriched = await enrichOne(slug, name);
      out[slug] = enriched;
      const c = enriched.confidence ?? "low";
      if (c === "high") high++;
      else if (c === "override") override++;
      else low++;
      const bits: string[] = [c];
      if (enriched.mbid) bits.push(enriched.mbid.slice(0, 8));
      if (enriched.bio) bits.push("bio");
      if (enriched.photo) bits.push("photo");
      if (enriched.spotifyId) bits.push("spotify");
      process.stdout.write(`${bits.join(" ")}\n`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`FAILED: ${msg} (skipping)`);
      out[slug] = { slug, name, confidence: "low", resolvedAt: new Date().toISOString() };
      low++;
    }
  }

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  console.log(
    `\nwrote ${Object.keys(out).length} artists -> ${OUT_PATH}` +
      `\n  high: ${high}  override: ${override}  low/skipped: ${low}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
