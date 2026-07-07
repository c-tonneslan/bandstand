// Spotify artist embed. Server-safe — a plain iframe, no client JS. The frame
// picks up the page radius/line tokens so it reads right in both themes.

export default function SpotifyEmbed({ spotifyId, name }: { spotifyId: string; name: string }) {
  return (
    <iframe
      src={`https://open.spotify.com/embed/artist/${spotifyId}`}
      title={`${name} on Spotify`}
      width="100%"
      height="152"
      loading="lazy"
      allow="encrypted-media"
      className="rounded-[--radius] border border-line"
      style={{ colorScheme: "normal" }}
    />
  );
}
