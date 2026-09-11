---
name: Speedy Meals Mobile Design System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#5c403c'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#916f6b'
  outline-variant: '#e6bdb8'
  surface-tint: '#bf0715'
  primary: '#b70011'
  on-primary: '#ffffff'
  primary-container: '#dc2626'
  on-primary-container: '#fff6f5'
  inverse-primary: '#ffb4ab'
  secondary: '#1d4ed8'
  on-secondary: '#ffffff'
  secondary-container: '#4069f2'
  on-secondary-container: '#fffbff'
  tertiary: '#7f4f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#a06500'
  on-tertiary-container: '#fff7f1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000b'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b7c4ff'
  on-secondary-fixed: '#001551'
  on-secondary-fixed-variant: '#0039b5'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
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
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.03em
  price-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '800'
    lineHeight: 22px
    letterSpacing: -0.01em
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
  spacing-lg: 1.25rem
  spacing-xl: 1.5rem
  spacing-2xl: 2rem
  screen-edge: 1rem
  card-gutter: 0.75rem
  touch-target-min: 2.75rem
---

## Brand & Style

This design system delivers an energetic, ultra-responsive, and appetite-inducing mobile experience tailored for on-the-go food delivery across iOS and Android Material 3 platforms. The visual language blends the agility of rapid courier movement with the reassuring clarity required for fast checkout, dynamic order tracking, and culinary discovery.

### Emotional Response & Personality
- **Energetic & Prompt:** Inspired by swift motion lines and urgent delivery fulfillment, interactions feel instantaneous and purposeful.
- **Hunger-Inducing & Friendly:** Bold warm accents draw the eye to appetizing food photography, seasonal promotions, and top ratings.
- **Trustworthy & Reliable:** Precision-engineered layouts, crisp typography, and high-visibility status trackers eliminate friction and checkout anxiety.

### Design Movement & Aesthetic
- **Hybrid iOS Human Interface & Material 3:** Seamlessly blends iOS fluid gestures, blurred navigation chrome, and tactile cards with Material 3 surface containers, dynamic pills, and adaptive state layers.
- **Modern Clean Functionalism:** High contrast typography, generous 16px touch buffers, crisp container boundaries, and soft ambient shadows that frame food imagery as the primary hero.

## Colors

The color palette is derived directly from the courier mark: energetic red representing speed and urgency, deep royal blue representing transit logistics and customer security, and golden amber highlighting culinary excellence and value offers.

### Functional Mapping
- **Primary (`#DC2626`):** The brand speed red drives primary call-to-actions, cart badges, critical action triggers, order submission buttons, and live eta alerts.
- **Secondary (`#1D4ED8`):** Royal blue directs technical and operational wayfinding, courier tracking routes, verified vendor checkmarks, informational alert chips, and navigation states.
- **Tertiary (`#F59E0B`):** Warm amber illuminates star ratings, limited-time discounts, featured chef highlights, loyalty rewards, and pending preparation statuses.
- **Neutral Surface & Background (`#F8FAFC`, `#F1F5F9`, `#FFFFFF`):** High-efficiency slate tints build spatial depth without visual noise. Pure `#FFFFFF` elevates active cards against the `#F8FAFC` screen canvas.
- **Text & Hierarchy (`#0F172A`, `#475569`, `#94A3B8`):** Deep slate-black ensures absolute legibility outdoors under bright daylight, with graded secondary and muted tiers for auxiliary metadata.

## Typography

Plus Jakarta Sans provides geometric warmth, high x-height clarity, and open apertures, guaranteeing instant readability for fast-paced browsing and small mobile screens.

### Type Hierarchy & Usage Rules
- **Display & Large Headlines:** Used exclusively for home hero promotions, celebratory checkout states, and order confirmation splash views.
- **Headline Sm / Md:** Applied to restaurant titles, dish names in menus, and card headers. Set with tight negative tracking for a confident, editorial look.
- **Price & Numeric Display:** Set in heavy 800 weights (`price-display`) to ensure item pricing, checkout summaries, and delivery times are immediately legible at a glance.
- **Labels & Tags:** Uppercase or semi-bold micro-copy (`label-sm` and `label-md`) delivers rapid comprehension on delivery badges, discount ribbons, and dietary pills.

## Layout & Spacing

The layout model is constructed on an 8-point base grid, calibrated for standard mobile viewports (375px to 428px) with responsive fluid scaling for compact tablets.

### Mobile Grid & Layout Principles
- **Screen Margins:** Standard horizontal page margin is strictly 16px (`1rem`), aligning search bars, banner carousels, and section headers consistently.
- **Fluid Feed & Gutters:** Product and merchant feeds utilize a flexible single-column or 2-column card arrangement with 12px (`0.75rem`) internal gutters.
- **Bottom Navigation Clearance:** All scroll views implement an 88px bottom padding buffer to prevent floating sticky checkout triggers and navigation bars from obscuring content.
- **Touch Accessibility:** Every interactive element adheres to a minimum touch target of 44x44px (`2.75rem`), with active tap states extending beyond visual container boundaries where needed.

## Elevation & Depth

Visual hierarchy uses a refined layering model pairing subtle slate-tinted ambient shadows with crisp border contours to keep food visuals crisp and unclouded.

### Layer Architecture
- **Base Canvas (Level 0):** Pure slate background (`#F8FAFC`) supporting the scroll canvas.
- **Resting Cards (Level 1):** Solid white (`#FFFFFF`) with a dual-layer soft ambient drop: `0px 2px 8px -2px rgba(15, 23, 42, 0.06), 0px 1px 3px 0px rgba(15, 23, 42, 0.04)`. Outlined with a hairline border (`1px solid #F1F5F9`).
- **Interactive Elevated Modules (Level 2):** Dish modifier sheets, sticky category filter bars, and horizontal sliding menus: `0px 8px 16px -4px rgba(15, 23, 42, 0.08), 0px 4px 6px -2px rgba(15, 23, 42, 0.03)`.
- **Floating Overlays & Active Trackers (Level 3):** Live courier map cards, floating cart summary bar, and checkout bottom sheets: `0px 16px 32px -6px rgba(15, 23, 42, 0.12), 0px 6px 12px -3px rgba(15, 23, 42, 0.06)`.
- **Modals & Toast Alerts (Level 4):** Central alerts and quick-reorder popups: `0px 24px 48px -12px rgba(15, 23, 42, 0.18)`.

## Shapes

The design system standardizes on a rounded, contemporary shape aesthetic that balances playful food hospitality with clean software precision.

### Radius Distribution
- **Cards & Food Tiles (`rounded-xl` / 16px - 20px):** Restaurant cards, menu items, and promo billboards use a continuous 16px corner radius, matching mobile viewport corner curvature.
- **Controls & Input Fields (`rounded-lg` / 12px - 14px):** Text fields, search bars, counter selectors, and modal sheets employ 12px to 14px corners for structured touchability.
- **Pills & Badges (`rounded-full` / 9999px):** Status badges (e.g., "Fastest Delivery", "Top Rated"), category filter chips, and primary floating action buttons use full pill rounding for finger-friendly affordance.

## Components

### Buttons
- **Primary ("Order Now" / "Checkout"):** Filled `#DC2626` background, white text (`#FFFFFF`), bold font, 52px height on mobile, 16px border radius. Active state: subtle scale down (`0.98`) with `#B91C1C`.
- **Secondary / Action ("Add", "Change"):** Surface white background, `#DC2626` or `#1D4ED8` text, 1.5px border matching text color.
- **Ghost / Tertiary:** Transparent background, slate-900 text, used for cancel actions, header icons, and text links.

### Category & Filter Chips
- **Unselected:** Light slate background (`#F1F5F9`), slate text (`#475569`), pill shape, 36px height, 12px horizontal padding.
- **Selected:** Deep navy-slate (`#0F172A`) or primary red (`#DC2626`) fill with white text and icon.

### Input Fields & Search Bars
- **Main Search Bar:** Height 48px, background `#FFFFFF` on `#F8FAFC` canvas, rounded to 14px, subtle border `#E2E8F0`, left icon in `#94A3B8`, right mic or filter action icon in `#DC2626`.
- **Form Inputs:** 52px height, floating label or fixed label above, active focus ring: `2px solid #1D4ED8` with 2px soft outer glow.

### Cards (Restaurant & Dish Items)
- **Restaurant Card:** 16px corner radius, white background, high-ratio (16:9) imagery with top-left pill overlay (delivery time in minutes, e.g. "15-20 min" with `#DC2626` background), bottom row highlighting rating (`#F59E0B` star + bold score) and delivery fee badge in `#1D4ED8`.
- **Horizontal Dish Card:** Compact 96x96px rounded image on the right, title, dietary icons, truncated description, bold price, and an elevated circular or pill "+" add button in `#DC2626`.

### Checkboxes, Steppers & Radio Buttons
- **Radio Buttons:** Circular selector with an animated 3px ring in `#1D4ED8` when selected for modifier groups (e.g., single choice sizing).
- **Checkboxes:** 20x20px, 6px corner radius, `#DC2626` check fill for optional add-ons.
- **Quantity Stepper:** Pill-shaped inline counter (`-` / `count` / `+`), `#F1F5F9` container, `#0F172A` bold text, with red accent taps.

### Delivery Tracker & Status Pills
- **Live Status Ribbon:** Multi-stage progress line with delivery man icon, royal blue active trail (`#1D4ED8`), completed stages in green, and real-time live pulse dot in brand red (`#DC2626`).
- **Rating Tag:** Pill container with warm amber tint (`#FEF3C7`), dark amber text (`#92400E`), and solid gold star icon (`#F59E0B`).