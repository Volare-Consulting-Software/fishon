// A tiny moon glyph whose lit fraction roughly tracks illumination %.
export function MoonIcon({ illumination }: { illumination: number }) {
  const frac = Math.max(0, Math.min(100, illumination)) / 100;
  // Offset a dark disc over a lit disc; more illumination -> less shadow.
  const offset = (1 - frac) * 14;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#e9c64a" stroke="#c9a93a" />
      {frac < 0.95 && (
        <circle cx={8 + offset} cy="8" r="7" fill="#312a45" />
      )}
    </svg>
  );
}
