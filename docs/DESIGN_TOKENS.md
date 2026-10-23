# SpeedyMeals Design Tokens

> **Status: APPROVED (v1.0.0, 2026-10-23).** The owner confirmed the Sharp radius policy (§5) and the `red.600` CTA fill (§3).
> **Source of truth:** [`design-tokens/tokens.json`](../design-tokens/tokens.json) (W3C DTCG format). This document explains it; when they disagree, the JSON wins.

Brand direction: **sharp, premium.** Red is for the primary action, blue signals trust, tan is used sparingly as a premium accent, and everything else is ink on paper.

---

## 1. Decisions at a glance

| Area | Decision | Why |
|---|---|---|
| Palette | Adopt the **web** palette (`#E23A2E` / `#1E5FA8` / `#C7A874` / ink `#15171A`) on both platforms. Mobile drops Tailwind red-600/blue-700/amber and Stitch's lavender surfaces. | The web palette is the more distinctive brand. The mobile palette is mostly Tailwind and Material defaults. |
| CTA fill | `red.600 #C92F24`, not brand `red.500 #E23A2E`. | White text on `#E23A2E` is **4.30:1**, which fails WCAG AA for button-size text. `#C92F24` is 5.36:1. `#E23A2E` stays the brand red for logos, icons, large display and the live dot. |
| Neutrals | One **ink** scale replaces Tailwind `slate-*` (web dashboards) and Stitch `#131B2E`/`#5C403C` (mobile). | There are currently three neutral families: warm paper, cool slate and lavender M3. |
| Font | **Figtree** for UI on both platforms; **Archivo Black** for display only; **JetBrains Mono** for codes, IDs and eyebrows. | Mobile declares Plus Jakarta Sans but **never bundles it**, so it actually renders Roboto/SF today. |
| Radius | **Sharp:** 0 / 2 / 4 / 6 / 8 / pill, and nothing between 8px and pill. *Confirmed.* | Today web clusters at 8–16px and mobile at 12–20px, which reads as soft and generic. |
| Elevation | Structure comes from borders. Three shadow levels only, tinted with ink. | 43 ad-hoc `BoxShadow`s on mobile and 9 shadow variants on web. |
| Focus | 2px **blue** ring with a 2px offset on both platforms. | Web uses `rose-500` and mobile uses blue. Blue keeps focus distinct from error red. |
| Min text size | **11px.** | Web has 108 uses of `text-[10px]`/`text-[9px]`/`text-[9.5px]`. |
| Dark theme | **Deferred.** "Nocturne Rush" (cyan `#38BDF8`, Space Grotesk, `#0F131D`) is off-brand and is not adopted. Ink-on-dark tokens cover dark marketing sections. | It is a separate visual language, not a dark mode of this brand. |

---

## 2. Audit: current state (2026-10-23)

Inputs: `website/app/globals.css`, `mobile_app/lib/constants/colors.dart`, `mobile_app/lib/core/theme/app_theme.dart`, and the Stitch `DESIGN.md` files. `stitch_speedy_meals_app_ui_design/DESIGN.md` is byte-identical to `speedy_meals_mobile_design_system/DESIGN.md`, and the `stitch_speedy_login/…` copies are identical too, so there are two unique specs: *Mobile Design System* (light) and *Nocturne Rush* (dark).

### 2.1 Color mismatches

| Role | Web `globals.css` | Mobile `colors.dart` | Stitch light DESIGN.md | Nocturne Rush |
|---|---|---|---|---|
| Primary / CTA | `#E23A2E` | `#DC2626` (Tailwind red-600) | `primary #B70011`, `primary-container #DC2626`. **Mobile swaps these two roles.** | `#EF4444` / `#FFB3AD` |
| Pressed | `#C92F24` (`--dynamic-accent`) | `primaryContainer #B70011` | prose: `#B91C1C` | `#DC2626` |
| Secondary | blue `#1E5FA8` | `#1D4ED8` (Tailwind blue-700) | `#1D4ED8` | cyan `#38BDF8` / `#7BD0FF` |
| Tertiary / accent | tan `#C7A874` | amber `#F59E0B` | token `#7F4F00`, prose `#F59E0B`. **Self-contradicting.** | `#F9BD22` / `#FBBF24` |
| Background | `#FFFFFF` | `#FAF8FF` (lavender) | token `#FAF8FF`, prose `#F8FAFC`. **Self-contradicting.** | `#0F131D` / `#0B0F19` |
| Text | `#15171A` | `#131B2E` (navy) | `#131B2E`, prose `#0F172A` | `#DFE2F1` |
| Secondary text | `#5B5F66` | `onSurfaceVariant #5C403C` (**brown**) | `#5C403C`, prose `#475569` | `#E4BEBA` |
| Border | `#E4E2DD` (warm) | `surfaceContainerHigh #E2E7FF` (lavender) | prose `#E2E8F0` | `#334155` |
| Error | none (web reuses rose-600) | `#BA1A1A` | `#BA1A1A` | `#FFB4AB` |
| Success | none (`#10B981` hard-coded 52×) | none (`#10B981` hard-coded 20×) | "green" (unspecified) | — |

Web dashboards (`app/admin`, `app/restaurant`, `components/dashboard`, `components/charts`) **do not use the brand tokens at all**. They use the default Tailwind palette: **2,544** `slate-*`/`rose-*`/`emerald-*`/etc. classes. The top values are `slate-200` (304), `slate-900` (285), `slate-400` (212), and `rose-600` (99) acting as the brand red. Brand token classes (`bg-red`, `text-ink`, …) appear **651** times, mostly on marketing pages.

### 2.2 Typography mismatches

| | Web | Mobile | Stitch light | Nocturne |
|---|---|---|---|---|
| UI font | Figtree | `'Plus Jakarta Sans'` (14 refs), **not in pubspec and no `google_fonts`, so it falls back to Roboto/SF** | Plus Jakarta Sans | Plus Jakarta Sans (body) |
| Display | Archivo Black | — | — | Space Grotesk |
| Mono | JetBrains Mono (308 `font-mono` uses) | — | — | — |
| Scale | ad hoc Tailwind and arbitrary sizes (`text-[11px]` 157, `text-[10px]` 98, `text-[9px]` 10) | M3 scale 32/26/22/18/16/16/14/12/14/12/11 | same as mobile | 40/32/28/22/18… |
| Tracking | display `-0.03em`/`-0.035em`, mono `+0.025em` | **Bug:** `letterSpacing: -0.02` is in *logical pixels* in Flutter, not em, so tracking is effectively zero | em values | em values |

### 2.3 Radius

| | Values in use |
|---|---|
| Web (688 `rounded*` classes) | `rounded-xl` 189, `rounded-lg` 188, `rounded-full` 149, `rounded-2xl` 80, `rounded-md` 29, `rounded` 24, `rounded-xs` 14, `rounded-none` 9, `rounded-3xl` 4. Marketing hero CTAs are `rounded-none` while dashboard CTAs are `rounded-xl`. |
| Web CSS | `.nav-pill` 9999px, `.nav-drawer` 16px |
| Mobile theme | cards 16, inputs 14, buttons 16 |
| Mobile widgets (literals) | 16 (63×), 12 (59×), 20 (48×), 14 (24×), 999 (15×), 10, 8, 24, 6, 4, 18, 36, 22, 5, 3, 2: **16 distinct radii** |
| Stitch light | sm 4 / 8 / md 12 / lg 16 / xl 24, cards 16–20, controls 12–14 |
| Nocturne | controls 8, cards 16–24 |

### 2.4 Spacing, elevation, buttons, inputs

| | Web | Mobile | Stitch |
|---|---|---|---|
| Spacing | Tailwind 4px scale (consistent) | `EdgeInsets` literals: 16 (92×), 20 (47×), 12, 8, 14, 10, 4, 24, 6, **5, 3, 7**. Off-grid values are common. | 4px base, screen edge 16 (light) vs 20 (Nocturne) |
| Touch target | not enforced | not enforced | 44 (light) vs 48 (Nocturne) |
| Elevation | `shadow-xs` 153, `shadow-2xs` 52, `xl` 21, `sm` 20, `md` 12, `2xl` 7, 8 arbitrary, plus glass nav tokens | theme `elevation: 0`, bottom nav `8`, **43 ad-hoc `BoxShadow`** | 4 slate-tinted levels (light), glow shadows (Nocturne) |
| Primary button | Marketing: `bg-red` + `rounded-none` + uppercase. Dashboard: `bg-rose-600`/`bg-slate-900` + `rounded-lg`/`rounded-xl`. **Two different primaries.** | `#DC2626`, radius 16, padding 20×14, Plus Jakarta 600 14px, no fixed height | 52px, radius 16 |
| Input | `rounded-lg` (25) / `rounded-xl` (18), `py-2.5`, focus `rose-500` ring + border | radius 14, lavender `#E2E7FF` border (**1.2:1, fails 3:1**), focus blue 2px | 48–52px, 14px radius, blue focus (light) / red focus (Nocturne) |
| States | `EmptyState`, `NetworkStatusBanner`, `loading.tsx`, `error.tsx`. No unauthorized/forbidden. | 5 skeleton widgets. Empty/error built inline per screen. | — |

### 2.5 Hard-coded values

| Location | Count |
|---|---|
| Web hex literals (`components/` + `app/`, excluding `globals.css`) | **473** in 24 files, 414 of them as Tailwind arbitrary `[#…]` |
| Web top offenders | `PartnerSection.tsx` 90, `terms/page.tsx` 62, `privacy/page.tsx` 53, `Footer.tsx` 35, `about/page.tsx` 22, `HeroSection.tsx` 15, `FlowingVelocityChart.tsx` 14 |
| Web most-repeated hex | `#10B981` 52, `#5B5F66` 47, `#8C9099` 44, `#A0A4AB` 36, `#E23A2E` 32, `#15171A` 24, `#373C46` 22 |
| Web default-palette classes | **2,544** (`app/admin` 1,272, `app/restaurant` 797, `components/dashboard` 180, `components/charts` 166) |
| Web `rounded*` classes | **688** |
| Mobile `Color(0x…)` outside `colors.dart` | **585** in 28 files. `0xFFDC2626` alone appears 145×. Only 5 files import `SpeedyMealsColors`. |
| Mobile `Colors.white` / `Colors.black` | 191 / 42 |

### 2.6 Accessibility defects found in existing tokens

| Pair | Ratio | Verdict |
|---|---|---|
| white on `#E23A2E` (web CTA) | 4.30 | fails AA for normal text |
| `#8C9099` meta text on white (used 44×) | 3.20 | fails |
| white on `#10B981` success | 2.54 | fails |
| tan `#C7A874` on white | 2.26 | fails (the existing `--tan-text` fixes this) |
| mobile input border `#E2E7FF` on white | ~1.2 | fails 1.4.11 (3:1) |

---

## 3. Color

All ratios were computed with the WCAG 2.x formula against the stated background.

### Brand

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `red.500` | `#E23A2E` | Brand mark, icons, display ≥24px bold, live dot, text selection | 4.30 white-on |
| `red.600` | `#C92F24` | **CTA fill**, red text on light, error | 5.36 |
| `red.700` | `#A8241B` | CTA hover/pressed | 7.16 |
| `red.50` | `#FDF0EE` | Error/CTA tint | red.600 on it: 4.82 |
| `red.on-dark` | `#FF6B5E` | Red on ink surfaces | 6.43 |
| `blue.600` | `#1E5FA8` | Links, info, verified, tracking, focus ring | 6.45 |
| `blue.700` | `#174C88` | Link hover | 8.66 |
| `blue.50` | `#EAF1FA` | Info tint | blue.600 on it: 5.67 |
| `blue.on-dark` | `#6FA0E0` | Blue on ink | 6.65 |
| `tan.400` | `#C7A874` | Decorative only: rules, icon fills, badges on ink | ink on tan: 7.94 |
| `tan.700` | `#8A6A32` | Tan text on light | 5.01 |
| `tan.100` | `#F3E8D0` | Premium tint | — |

**Usage rules**
- **Red:** at most one filled red CTA per view. Never use red for decoration or section backgrounds.
- **Blue:** use blue wherever the app makes a promise: tracking, verification, payment security, links, and focus. Blue is never a CTA fill.
- **Tan:** at most one tan element per screen, used for premium or partner moments (gold-tier badge, partner rule line). Never use tan for status, buttons or body text.

### Ink (neutrals)

| Token | Hex | Use |
|---|---|---|
| `ink.50` | `#F6F5F3` | Canvas, subtle fill |
| `ink.100` | `#EFEEEB` | Skeleton, hover fill, disabled fill |
| `ink.200` | `#E4E2DD` | Hairline divider, card border |
| `ink.300` | `#CFCCC6` | Strong divider, secondary-button border |
| `ink.400` | `#A0A4AB` | Disabled text, decorative icons (not meaningful text on light) |
| `ink.500` | `#6E727A` | Placeholder, **on white only** (4.83) |
| `ink.600` | `#5B5F66` | Secondary/meta text (6.42 white, 5.89 ink.50) |
| `ink.700` | `#373C46` | Labels, strong secondary |
| `ink.800` | `#25282F` | Raised surface on dark |
| `ink.850` | `#1A1D23` | Dark section surface |
| `ink.900` | `#15171A` | Primary text, inverse surface |
| `border.control` | `#8C877E` | Input/checkbox boundary (3.57, meets 1.4.11) |

### Semantic

| Token | Hex | Notes |
|---|---|---|
| `success` / `success-bg` | `#0E7A50` / `#E8F5EE` | Replaces `#10B981`. Text on bg: 4.78 |
| `warning` / `warning-bg` | `#9A5B00` / `#FDF4E3` | Text on bg: 4.97 |
| `rating` | `#F59E0B` | Star icon fill only |
| `error` / `error-bg` | = `red.600` / `red.50` | Always paired with an icon and message text, so it can't be confused with a CTA |
| `info` / `info-bg` | = `blue.600` / `blue.50` | |

---

## 4. Typography

| Family | Web | Mobile | Use |
|---|---|---|---|
| **Figtree** | `next/font` (already loaded) | Bundle TTFs in `assets/fonts/` (OFL) | All UI text |
| **Archivo Black** | already loaded | Bundle; splash and order confirmation only | Marketing hero, celebratory moments |
| **JetBrains Mono** | already loaded | Bundle (Regular, Medium) | Order IDs, promo codes, ETAs, eyebrow labels |

**Scale.** This keeps the existing mobile scale, which is sensible, and adds a web-only hero size and an eyebrow style.

| Token | Size / line-height | Weight | Tracking |
|---|---|---|---|
| `display-xl` (web hero) | 56 / 0.95 (clamp → 32 on mobile widths) | Archivo Black 400 | -0.035em |
| `display-lg` | 32 / 40 | 800 | -0.02em |
| `display-md` | 26 / 34 | 700 | -0.015em |
| `headline-lg` | 22 / 28 | 700 | -0.01em |
| `headline-md` | 18 / 24 | 600 | -0.005em |
| `headline-sm` | 16 / 22 | 600 | 0 |
| `body-lg` | 16 / 24 | 400 | 0 |
| `body-md` | 14 / 20 | 400 | 0 |
| `body-sm` | 12 / 16 | 400 | 0.01em |
| `label-lg` | 14 / 20 | 600 | 0.01em |
| `label-md` | 12 / 16 | 600 | 0.02em |
| `label-sm` | 11 / 14 | 700 | 0.03em |
| `eyebrow` | 11 / 14 mono, UPPERCASE | 500 | 0.06em |
| `price` | 18 / 22 | 800 | -0.01em |

Rules:
- **Minimum size is 11px.**
- Uppercase is only for `eyebrow` and `label-sm` badges. Buttons use sentence case on every surface.
- Flutter: `letterSpacing` must be `em × fontSize`, for example `-0.02 * 32 = -0.64`.

---

## 5. Radius

**Policy: "Sharp" (confirmed 2026-10-23).** Six steps. Nothing between 8px and pill.

| Token | px | Applies to |
|---|---|---|
| `none` | 0 | Full-bleed media, hero banners, tables, page sections |
| `xs` | 2 | Status badges/tags, checkboxes, progress bars |
| `sm` | 4 | **Buttons, inputs, selects, chips**, segmented controls, tooltips |
| `md` | 6 | **Cards**, menus, popovers, toasts, thumbnails |
| `lg` | 8 | Dialogs, bottom sheets (top corners only), promo cards |
| `full` | 9999 | Avatars, switches, status dots, unread-count badges, and the existing floating nav pill (`.nav-pill`, a scoped exception). Floating action buttons use `sm`, like other buttons. |

Consequences:
- Status badges and filter chips are **no longer pills**. This is the most visible change on mobile.
- `.nav-drawer` changes from 16px to 8px.
- Tailwind `rounded-xl`, `2xl` and `3xl` are retired. Phase (a) temporarily aliases them to 8px so the whole site snaps to policy in one change before the codemod runs.

Alternatives, if Sharp is too far from the current look:
- **Soft-sharp:** 4 / 6 / 8 / 12, with pills for chips and badges. Closer to today, but less distinctive.
- **Square:** 0 everywhere except `full`. Matches the marketing hero CTA, but is harsh on touch UIs.

---

## 6. Spacing and sizing

- **Scale (4px base):** 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80. Off-grid values (3, 5, 7, 10, 14, 18) are not allowed. Mobile currently uses 10 and 14 often; these round to 8/12 and 12/16.
- **Layout:**
  - Mobile screen edge: 16.
  - Web gutters: 16 / 24 / 32 (sm/md/lg).
  - Card padding: 16 (compact 12).
  - Card gap: 12.
  - Section gap: 24 on mobile, 64 on web marketing.
  - Bottom-nav clearance: 88.
- **Controls:**
  - Touch minimum: 44.
  - Control heights: `sm` 32 (web dashboards only), `md` 40 (web default), `lg` 48 (mobile default and web marketing CTA).

## 7. Elevation

Borders carry structure. Shadows only signal that something has lifted.

| Level | Shadow | Use |
|---|---|---|
| 0 | none | Flat content, list rows |
| 1 | `0 1px 2px rgba(21,23,26,.06)` + 1px `ink.200` border | Resting cards |
| 2 | `0 4px 12px -2px rgba(21,23,26,.10)` | Menus, popovers, sticky filter bars |
| 3 | `0 12px 32px -8px rgba(21,23,26,.18)` | Dialogs, bottom sheets, floating cart |

Flutter uses `elevation: 0` everywhere, with these as `BoxShadow` constants. The web glass nav keeps its own scoped tokens.

---

## 8. Components

### Buttons

| Variant | Fill | Text | Border | Hover / pressed | Use |
|---|---|---|---|---|---|
| **Primary** | `red.600` | white | — | `red.700`, scale 0.97 / 80ms | One per view: Order, Checkout, Save |
| **Secondary** | white | `ink.900` | 1px `ink.300` | bg `ink.50` | Cancel, Change, secondary actions |
| **Ghost** | transparent | `ink.700` | — | bg `ink.100` | Toolbar and header actions |
| **Link** | — | `blue.600` | — | `blue.700` + underline | Inline navigation |
| **Destructive** | white | `red.600` | 1px `red.600` | bg `red.50` | Delete, suspend (always behind a confirm) |

Shared button rules:
- Radius `sm`. Height `md` 40 on web, `lg` 48 on mobile.
- Label is `label-lg`, sentence case.
- Icon is 16/20px with an 8px gap.
- **Disabled:** `ink.100` fill, `ink.400` text, no shadow.
- **Loading:** a spinner replaces the label, width stays fixed, and `aria-busy` is set.
- **Focus:** 2px `blue.600` ring with a 2px offset.

### Inputs

- **Box:**
  - Height 40 on web, 48 on mobile.
  - Radius `sm`, white fill, 1px `border.control`.
  - Text 16px wherever the input can render on a phone, to avoid iOS zoom.
- **Label and helper text:**
  - Label sits above the field in `label-md` `ink.700`.
  - Helper text is `body-sm` `ink.600`.
  - Placeholder is `ink.500`.
- **Focus:** border `blue.600`, plus a 3px `blue.600 @ 20%` ring on web or a 2px border on mobile.
- **Error:** border `red.600`, with helper text in `red.600` and an error icon. Set `aria-invalid` and `aria-describedby`.
- **Disabled:** `ink.50` fill, `ink.400` text.

### Cards
White fill, 1px `ink.200` border, radius `md`, elevation 1, padding 16. On hover (web, interactive cards only), the border becomes `ink.300`.

### Badges
Radius `xs`, `label-sm`, height 20, horizontal padding 6. Each badge uses a semantic `*-bg` fill with the matching semantic text color.

---

## 9. Shared states (phase d)

The same seven states exist on both platforms. They share copy structure (title, one-line body, optional action), icon size (40px, `ink.400`) and layout (centered, max-width 360).

| State | Trigger | Action | Notes |
|---|---|---|---|
| **Loading** | Initial fetch | — | Skeletons in `ink.100` with a shimmer. Spinners are only for in-button and pull-to-refresh. |
| **Empty** | 0 results | Primary or secondary, depending on context | Explains why the list is empty and what to do next |
| **Error** | 5xx / network failure with a cache | "Try again" (secondary) | Never show raw error text. Log the request ID in mono `body-sm`. |
| **Unauthorized** | 401 / session expired | "Sign in" (primary) | Keeps the return URL |
| **Forbidden** | 403 / RBAC denial | "Go back" (secondary) | No sign-in CTA, because signing in again does not help |
| **Offline** | No connectivity | — | Persistent top banner using `warning-bg` / `warning` text. Reuses `NetworkStatusBanner`. |
| **Not found** | 404 | "Go home" | Already exists on web (`not-found.tsx`) |

---

## 10. Implementation phases

Each phase is one PR. After each phase, run `bun run lint`, `bun run typecheck` and `bun run build` in `website/`, and `flutter analyze` in `mobile_app/`.

**Status:** (a), (b) and (c) are done (2026-10-23). (d), the shared state components, is next.

**Mobile tokens are generated, never hand-edited.** After changing `tokens.json`, run `node design-tokens/generate-dart.mjs` from the repo root. It rewrites `mobile_app/lib/core/theme/app_tokens.dart`. Web values in `website/app/globals.css` are still updated by hand.

**Allowed exceptions to "no raw colors":**
- Third-party brand marks (footer social icons) use named tokens `--color-social-*`, with each brand's exact value.
- SVG and inline-style colors come from `lib/design-tokens.ts`, a hex mirror of the JSON.

- **(a) Web tokens.**
  1. Rewrite the `@theme`/`:root` blocks in `globals.css` from `tokens.json`.
  2. Override Tailwind's `--color-slate-*` → ink, `--color-rose-*` → brand red, and `--color-emerald-*` → success.
  3. Clamp `--radius-xl/2xl/3xl` to 8px.

  The 2,544 default-palette classes and 688 radii conform immediately, with zero component diffs.
- **(b) Web hard-coded hex.**
  1. Replace the 473 hex literals with token utilities.
  2. Codemod `slate-*`/`rose-*` → `ink-*`/`red-*`, and `rounded-xl` → `rounded-md`/`lg` per §5.
  3. Remove the aliases added in phase (a).
- **(c) Mobile theme.**
  1. Bundle the fonts.
  2. Regenerate `colors.dart` and `app_theme.dart` from `tokens.json`, and add `AppRadius`, `AppSpacing` and `AppShadows`.
  3. Replace the 585 `Color(0x…)` literals.
  4. Fix the `letterSpacing` units.
- **(d) Shared state components:** web `components/states/*`, plus Flutter `lib/widgets/states/*`.
