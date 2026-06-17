interface HighlightProps {
  text: string | null | undefined;
  query: string;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Renders text with the matching query substring(s) highlighted. */
export default function Highlight({ text, query }: HighlightProps) {
  const value = text ?? '';
  const q = query.trim();
  if (!q) return <>{value || '—'}</>;

  const parts = value.split(new RegExp(`(${escapeRegExp(q)})`, 'ig'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="rounded bg-warn-bg px-0.5 text-warn-text">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
