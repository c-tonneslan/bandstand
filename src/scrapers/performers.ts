// Pulls performer names out of the personnel lines venues bury in event notes.
// Two shapes show up, both " · "-delimited: "Name - Instrument" (South) and
// "Name, Instrument" / "Instrument, Name" (Chris). We only trust a segment
// when exactly one side reads as an instrument off the vocabulary below, which
// throws out show-times and pricing prose that happens to share a delimiter.

const INSTRUMENTS = new Set([
  "piano",
  "keys",
  "keyboard",
  "keyboards",
  "organ",
  "bass",
  "double bass",
  "upright bass",
  "electric bass",
  "drums",
  "percussion",
  "guitar",
  "trumpet",
  "sax",
  "saxophone",
  "tenor",
  "tenor sax",
  "alto",
  "alto sax",
  "soprano",
  "sopranino",
  "baritone",
  "stritch",
  "trombone",
  "flute",
  "clarinet",
  "violin",
  "cello",
  "viola",
  "vibes",
  "vibraphone",
  "voice",
  "vocals",
  "vocal",
]);

// "Stritch, Sopranino, Trumpet" and "voice and tenor sax" both read as
// instruments — split on commas / "and" / slashes and require every piece.
function isInstrumentList(part: string): boolean {
  const pieces = part
    .toLowerCase()
    .split(/,|\/|\band\b|&/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (pieces.length === 0) return false;
  return pieces.every((p) => INSTRUMENTS.has(p));
}

function looksLikeName(part: string): boolean {
  return /^[A-Z][A-Za-z.'-]*(\s+[A-Z][A-Za-z.'-]*)+$/.test(part.trim());
}

// "Gabriel Meyer - Trombone" → "Gabriel Meyer"
function parseDashSegment(segment: string): string | null {
  const idx = segment.indexOf(" - ");
  if (idx === -1) return null;
  const name = segment.slice(0, idx).trim();
  const instrument = segment.slice(idx + 3).trim();
  if (!isInstrumentList(instrument) || !looksLikeName(name)) return null;
  return name;
}

// "Jonathan Paik, piano" or "Vocals, Declan Cashman" → name from whichever
// side is the person.
function parseCommaSegment(segment: string): string | null {
  const idx = segment.indexOf(",");
  if (idx === -1) return null;
  const left = segment.slice(0, idx).trim();
  const right = segment.slice(idx + 1).trim();
  if (isInstrumentList(right) && looksLikeName(left)) return left;
  if (isInstrumentList(left) && looksLikeName(right)) return right;
  return null;
}

// The scrapers append a "Two sets: 7:30pm, 9pm." line onto the personnel note
// without a "·" break, so it rides along on the last segment. Drop it first.
function stripTrailingProse(note: string): string {
  return note.replace(/\s*Two sets:.*$/i, "").trim();
}

function parse(note: string, forSegment: (segment: string) => string | null): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const segment of stripTrailingProse(note).split("·")) {
    const name = forSegment(segment.trim());
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

// "Name - Instrument · Name - Instrument · ..." → distinct names, order kept.
export function parseDashPersonnel(note: string): string[] {
  return parse(note, parseDashSegment);
}

// "Instrument, Name · Name, Instrument · ..." → distinct names, order kept.
// Trailing prose ("Two sets: 7:30pm, 9pm.") fails the shape and drops out.
export function parseCommaPersonnel(note: string): string[] {
  return parse(note, parseCommaSegment);
}
