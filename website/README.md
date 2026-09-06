# SpeedyMeals — Web (Next.js)

Restaurant Web Dashboard + Admin Panel, built on Next.js 15 (App Router) + Tailwind CSS v4.

## Structure

```
app/
├── (home)/            → "/"                  public landing (migrated from Vite prototype)
├── admin/              → "/admin/*"           admin panel (real segment — has its own URL prefix)
├── restaurant/         → "/restaurant/*"      restaurant portal (real segment — its own URL prefix)
├── layout.tsx           root layout, imports globals.css
└── globals.css          Tailwind v4 tokens + brand theme (red/blue/tan/ink)

components/
├── home/                landing page sections (client components — Framer Motion + hooks)
├── admin/                admin-only UI (empty, to build)
├── restaurant/           restaurant-only UI (empty, to build)
└── ui/                   shared primitives (Button, Card, Input… to build)

lib/
├── api/                  fetch wrappers — client.ts (base), admin.ts, restaurant.ts
├── auth/                 token + role-guard logic (stub)
└── hooks/

types/                    TS types mirroring backend schema (order, restaurant, rider, admin)
middleware.ts              route protection stub for /admin/* and /restaurant/*
```

## Important note on route groups vs. real segments

`(home)` is a **route group** — parentheses mean it adds no URL segment, so its pages live at `/`.

`admin/` and `restaurant/` are **real folders**, not groups — they must add `/admin` and `/restaurant`
to the URL, otherwise both portals' `/dashboard`, `/login`, `/orders` etc. would collide at the same
path. Do not rename these to `(admin)` / `(restaurant)`.

## Setup (Bun Infrastructure)

This project runs on **Bun** (>= 1.2 / 1.3) for dependency resolution, TypeScript runtime, scripts, and production builds.

```bash
bun install
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL to your FastAPI backend
bun run dev
```

### Available Scripts

- `bun run dev` — Start the Next.js development server
- `bun run build` — Create optimized production standalone build
- `bun run start` — Run production server
- `bun run lint` — Lint files using ESLint & Next.js core vitals rules
- `bun run typecheck` — Verify TypeScript typings without emitting files

### Docker Container (Bun Production)

A multi-stage Docker build utilizing `oven/bun:1-alpine` and Next.js standalone output is provided:

```bash
docker build -t speedymeals-web .
docker run -p 3000:3000 speedymeals-web
```

## What's implemented

- ✅ Landing page (`/`) — full migration from the Vite prototype (Navbar, Hero, Services, Partner, Footer, ReededGlassBackground)
- ⬜ Restaurant portal — page shells only, all marked `TODO`
- ⬜ Admin panel — page shells only, all marked `TODO`
- ⬜ Auth — `middleware.ts` and `lib/auth/` are stubs, wire before pilot
- ⬜ API layer — `lib/api/client.ts` has the fetch wrapper; `admin.ts`/`restaurant.ts` need real calls to FastAPI backend

## Brand tokens (from `globals.css`)

| Token | Value | Use |
|---|---|---|
| `--color-red` | `#E23A2E` | dominant CTA accent |
| `--color-blue` | `#1E5FA8` | trust signals |
| `--color-tan` | `#C7A874` | minimal accent only |
| `--color-ink` | `#15171A` | primary text |

Sharp corners are enforced globally (`border-radius: 0px !important`) — do not add rounded cards.
