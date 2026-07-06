// Server component that drops a typed JSON-LD payload into a <script> tag.
// One object or an array of them; either way Google reads it.

import type { MusicEventLd, MusicVenueLd } from "@/lib/jsonld";

type LdNode = MusicVenueLd | MusicEventLd;

export default function JsonLd({ data }: { data: LdNode | LdNode[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
