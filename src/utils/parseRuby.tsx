import type { ReactNode } from "react";

const RUBY_PATTERN = /\[(.+?)\]\{(.+?)\}/g;

export function parseRuby(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset lastIndex for global regex
  RUBY_PATTERN.lastIndex = 0;

  while ((match = RUBY_PATTERN.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const [, kanji, kana] = match;
    parts.push(
      <ruby key={match.index}>
        {kanji}
        <rp>(</rp>
        <rt>{kana}</rt>
        <rp>)</rp>
      </ruby>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // If no matches found, return the original string (not wrapped)
  if (parts.length === 0) return text;
  if (parts.length === 1) return parts[0];
  return <>{parts}</>;
}
