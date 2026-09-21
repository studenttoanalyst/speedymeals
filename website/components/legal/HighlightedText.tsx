import React from 'react';

interface HighlightedTextProps {
  text: string;
  query: string;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, query }) => {
  const trimmed = query ? query.trim() : '';

  if (!trimmed || !text) {
    return <>{text}</>;
  }

  const escaped = escapeRegExp(trimmed);
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, idx) => {
        const isMatch = part.toLowerCase() === trimmed.toLowerCase();
        if (isMatch) {
          return (
            <mark
              key={idx}
              className="find-match bg-[#FEF08A] text-ink font-semibold rounded-xs px-0.5 transition-all duration-150 inline"
            >
              {part}
            </mark>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
};
