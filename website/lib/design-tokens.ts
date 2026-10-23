/**
 * Hex mirror of design-tokens/tokens.json for places where Tailwind classes
 * or CSS variables cannot reach (SVG presentation attributes, canvas, alpha
 * concatenation like `${color}1f`). Prefer token classes (`text-ink-600`,
 * `bg-red-600`) everywhere else. Keep in sync with tokens.json.
 */
export const tokens = {
  red50: '#FDF0EE',
  red200: '#F5C2BC',
  red500: '#E23A2E',
  red600: '#C92F24',
  red700: '#A8241B',
  redOnDark: '#FF6B5E',
  blue50: '#EAF1FA',
  blue400: '#4F84C6',
  blue600: '#1E5FA8',
  blue700: '#174C88',
  blueOnDark: '#6FA0E0',
  tan100: '#F3E8D0',
  tan400: '#C7A874',
  tan700: '#8A6A32',
  ink50: '#F6F5F3',
  ink100: '#EFEEEB',
  ink200: '#E4E2DD',
  ink300: '#CFCCC6',
  ink400: '#A0A4AB',
  ink500: '#6E727A',
  ink600: '#5B5F66',
  ink700: '#373C46',
  ink800: '#25282F',
  ink850: '#1A1D23',
  ink900: '#15171A',
  paper: '#FFFFFF',
  green50: '#E8F5EE',
  green500: '#16905F',
  green600: '#0E7A50',
  amber50: '#FDF4E3',
  amber500: '#F59E0B',
  amber600: '#C27803',
  amber700: '#9A5B00',
} as const;

