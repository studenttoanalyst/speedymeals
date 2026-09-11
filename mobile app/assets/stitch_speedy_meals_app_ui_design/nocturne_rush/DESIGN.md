---
name: Nocturne Rush
colors:
  surface: '#0f131d'
  surface-dim: '#0f131d'
  surface-bright: '#353944'
  surface-container-lowest: '#0a0e18'
  surface-container-low: '#171b26'
  surface-container: '#1c1f2a'
  surface-container-high: '#262a35'
  surface-container-highest: '#313540'
  on-surface: '#dfe2f1'
  on-surface-variant: '#e4beba'
  inverse-surface: '#dfe2f1'
  inverse-on-surface: '#2c303b'
  outline: '#ab8986'
  outline-variant: '#5b403e'
  surface-tint: '#ffb3ad'
  primary: '#ffb3ad'
  on-primary: '#68000a'
  primary-container: '#ff5451'
  on-primary-container: '#5c0008'
  inverse-primary: '#b91a24'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#f9bd22'
  on-tertiary: '#402d00'
  tertiary-container: '#b88900'
  on-tertiary-container: '#372700'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3ad'
  on-primary-fixed: '#410004'
  on-primary-fixed-variant: '#930013'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#ffdf9f'
  tertiary-fixed-dim: '#f9bd22'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#0f131d'
  on-background: '#dfe2f1'
  surface-variant: '#313540'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  spacing-2xs: 0.25rem
  spacing-xs: 0.5rem
  spacing-sm: 0.75rem
  spacing-md: 1rem
  spacing-lg: 1.5rem
  spacing-xl: 2rem
  spacing-2xl: 3rem
  gutter-mobile: 1rem
  margin-mobile: 1.25rem
  gutter-tablet: 1.5rem
  margin-tablet: 2rem
  max-width-mobile: 480px
---

## Brand & Style

This design system is tailored for an agile, late-night food ordering and rapid delivery experience. Built primarily for OLED-screen devices, the aesthetic projects speed, precision, hunger relief, and premium nocturnal energy. 

The visual style blends sleek modern minimalism with vibrant cybernetic accents. It leverages deep space blacks and inky navy tones to eliminate eye fatigue during midnight browsing, punctuated by sharp kinetic crimson highlights that trigger appetite and signal velocity. Glowing electric cyan tracks delivery status in real-time, while warm amber illuminates curated cravings, hot food imagery, and exclusive midnight drops. The overall mood is frictionless, hyper-responsive, and unmistakably modern.

## Colors

The color architecture is calibrated for high contrast in low-light environments, prioritizing legibility and urgency:

- **Base & Canvas:** True deep void `#0B0F19` sets the backdrop, with `#0F172A` framing core layouts and `#1E293B` elevating interactive containers.
- **Primary (Speed Red):** `#EF4444` acts as the primary action driver, with `#DC2626` designated for pressed states and critical urgency counters.
- **Secondary (Kinetic Cyan & Royal Blue):** `#38BDF8` provides luminescence for live courier tracking, ETA indicators, and active filters, supported by `#3B82F6` for secondary links and technical meta-badges.
- **Tertiary (Warm Amber Highlight):** `#FBBF24` radiates comfort, ratings, promotional deal tags, and culinary focal points.
- **Typography Neutrals:** `#F8FAFC` yields ultra-crisp headline legibility, `#94A3B8` renders supportive metadata, and `#475569` handles disabled states and subtle dividers.

## Typography

The pairing combines the athletic, geometric precision of `Space Grotesk` with the ergonomic legibility of `Plus Jakarta Sans`. 

- `Space Grotesk` commands high-impact zones: delivery ETA countdowns, price values, category headers, and restaurant titles. Its subtle industrial nuance captures tech-forward speed.
- `Plus Jakarta Sans` handles long-form food descriptions, ingredient breakdowns, and configuration options. Its generous counters and balanced geometric proportions remain effortless to read even on dimmed displays.
- Tabular figures (`tnum`) must be enforced on numerical countdowns, live tracking times, and price points to prevent visual jump during live balance and route updates.

## Layout & Spacing

This mobile-first system utilizes an 8-point spatial cadence tailored for ergonomic one-thumb interaction:

- **Mobile Viewport (< 600px):** Single-column fluid view anchored with `1.25rem` horizontal outer margins and `1rem` internal gutters. Critical buttons and checkout workflows pin strictly to the bottom thumb zone (with adaptive safe-area padding).
- **Tablet / Large Form Factor (600px - 1024px):** 6-column fluid structure, max-width constrained to `768px` for list-detail flows or split dual-column views (cart persistent on right, menu on left).
- **Rhythm & Touch Targets:** Every touch target maintains a hard minimum bounding box of 48×48px. Compact metadata uses 4px micro-spacers, while card modules decouple across 16px to 24px increments to give night-adapted vision adequate optical breathing room.

## Elevation & Depth

Depth is established through dark-palette surface layering coupled with soft, colored ambient glows rather than standard black drop shadows:

- **Level 0 (Canvas):** Pure base `#0B0F19`. No elevation.
- **Level 1 (Resting Cards & Modules):** Tinted slate `#0F172A` with a 1px border of `#334155` at 40% opacity. Minimal elevation with subtle ambient black drop: `0px 4px 12px rgba(0, 0, 0, 0.4)`.
- **Level 2 (Active Cards, Popovers & Bottom Sheets):** `#1E293B` elevated with a 1px subtle highlight outline `rgba(248, 250, 252, 0.08)` and deeper shadow: `0px 8px 24px rgba(0, 0, 0, 0.6)`.
- **Level 3 (Speed & Status Glows):** High-urgency interactive elements (such as "Track Order" or "Order Now") project an energized tinted aura using their accent color (e.g., `0px 8px 20px rgba(239, 68, 68, 0.35)` for primary red, and `0px 4px 16px rgba(56, 189, 248, 0.35)` for live courier badges).

## Shapes

The design system employs a refined modern curvature (Level 2). Standard touch elements, interactive cards, and input fields utilize `0.5rem` (8px) for structural unity. 

Feature-rich menu items, promo containers, and bottom sheets expand to `1rem` (16px) or `1.5rem` (24px) for organic comfort. Floating action pills, status badges, and rapid re-order controls implement full capsule pill geometries (`9999px`) to maintain fluid momentum and touch-ready clarity.

## Components

### Buttons
- **Primary (Speed CTA):** Solid `#EF4444` background, `#F8FAFC` label (`label-lg`), with subtle red aura elevation. Active/pressed state dims to `#DC2626` and scales slightly (`scale-98`).
- **Secondary (Tracking / Action):** Semi-transparent `#38BDF8` background at 12% opacity, 1px `#38BDF8` stroke, with crisp `#38BDF8` text.
- **Ghost / Tertiary:** `#0F172A` background with `1px solid rgba(148, 163, 184, 0.2)` border, `#F8FAFC` label.

### Cards (Menu Items & Promos)
- Constructed with `#0F172A` surface, bounded by a 1px `#1E293B` border.
- Images feature a subtle inner vignette blending into `#0F172A` so imagery seamlessly fuses with dark mode surfaces.
- Hot meal badges sit top-left with a `#FBBF24` amber glowing dot.

### Chips & Filter Tags
- **Default:** `#0F172A` fill with `#94A3B8` label and rounded pill geometry (`9999px`).
- **Selected:** High-voltage cyan border `#38BDF8`, deep `#0B0F19` fill, with glowing `#38BDF8` text and an integrated drop-shadow glow.

### Lists & Order Timelines
- Items separated by semi-transparent `#1E293B` borders.
- Real-time courier timeline nodes leverage pulse animations with glowing `#38BDF8` outer rings connected by illuminated cyan stroke segments.

### Inputs & Quantity Selectors
- Dark recessed input fields utilizing `#0B0F19` fill with a `1px solid #334155` border. On focus, transitions cleanly to a crisp `#EF4444` border with soft red ambient glow.
- Stepper controls (+/-) adopt pill containers with haptic-ready targets and high-contrast numerical readouts.

### Live ETA Delivery Pill (Product Specific)
- Persistent floating top or bottom element: Dark glass surface (`#0F172A` at 85% opacity with `backdrop-blur: 16px`), highlighted by an amber `#FBBF24` countdown timer, speed-red courier icon, and micro linear progress bar.