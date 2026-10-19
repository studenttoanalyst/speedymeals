import React from 'react';
import Link from 'next/link';

interface HighlightedTextProps {
  text: string;
  query: string;
  crossLinks?: boolean;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, query, crossLinks = false }) => {
  const trimmed = query ? query.trim() : '';

  if (!text) return null;

  // Render text segments, handling search mark highlighting
  const renderHighlighted = (content: string) => {
    if (!trimmed) return <>{content}</>;
    const escaped = escapeRegExp(trimmed);
    const regex = new RegExp(`(${escaped})`, 'gi');
    const segments = content.split(regex);
    if (segments.length === 1) return <>{content}</>;

    return (
      <>
        {segments.map((seg, i) => {
          if (seg.toLowerCase() === trimmed.toLowerCase()) {
            return (
              <mark
                key={i}
                className="find-match bg-[#FEF08A] text-ink font-semibold rounded-xs px-0.5 transition-all duration-150 inline"
              >
                {seg}
              </mark>
            );
          }
          return <React.Fragment key={i}>{seg}</React.Fragment>;
        })}
      </>
    );
  };

  if (!crossLinks) {
    return renderHighlighted(text);
  }

  // Cross-linking for legal documents
  // Matches "Privacy Policy" or "Terms and Conditions" / "Terms of Service"
  const crossRegex = /(Privacy Policy|Terms and Conditions|Terms of Service)/g;
  const chunks = text.split(crossRegex);

  return (
    <>
      {chunks.map((chunk, idx) => {
        if (chunk === 'Privacy Policy') {
          return (
            <Link
              key={idx}
              href="/privacy#sec-4"
              className="text-blue underline underline-offset-2 hover:text-red transition-colors inline font-medium"
              title="View SpeedyMeals Privacy Policy Section 4"
            >
              {renderHighlighted(chunk)}
            </Link>
          );
        }
        if (chunk === 'Terms and Conditions' || chunk === 'Terms of Service') {
          return (
            <Link
              key={idx}
              href="/terms"
              className="text-blue underline underline-offset-2 hover:text-red transition-colors inline font-medium"
              title="View SpeedyMeals Terms and Conditions"
            >
              {renderHighlighted(chunk)}
            </Link>
          );
        }
        return <React.Fragment key={idx}>{renderHighlighted(chunk)}</React.Fragment>;
      })}
    </>
  );
};

