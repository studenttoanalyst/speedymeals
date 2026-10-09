# ADR-003: Hero Banner Carousel Architecture & Asset Pipeline

## Status
Accepted

## Context
The homepage hero section required dynamic, high-performance banner carousels advertising current offerings and partner programs across South Asia and the Middle East (Pakistan and Saudi Arabia). Initial implementations suffered from hardcoded image references, file locking on Windows (`EBUSY`) when developers attempted to update assets, aspect ratio distortion, and Next.js image cache invalidation lag.

## Decision
1. **Dynamic File-Based Scanner**:
   - Implemented `getHeroBanners()` in [`lib/banners.ts`](file:///d:/SpeedyMeals/speedymeals/website/lib/banners.ts) that automatically discovers candidate banners inside [`public/assets/banners/`](file:///d:/SpeedyMeals/speedymeals/website/public/assets/banners/).
   - Slides are ordered numerically by filename prefix (`01-brand.webp`, `02-rider.webp`, etc.).
   - Metadata, SEO alt descriptions, and links are managed declaratively in [`banners.json`](file:///d:/SpeedyMeals/speedymeals/website/public/assets/banners/banners.json).

2. **Aspect Ratio & Dual-Layer Ambient Art**:
   - Standardized target banner aspect ratio to **2.8:1** (e.g. 2098×749px or 2800×1000px).
   - In [`HeroBannerCarousel.tsx`](file:///d:/SpeedyMeals/speedymeals/website/components/home/HeroBannerCarousel.tsx), dual-layer rendering provides an ambient blurred background backdrop (`object-cover blur-2xl`) while keeping the foreground artwork crisp and uncropped (`object-contain`).

3. **Windows File-Locking Prevention**:
   - Disabled libvips caching with `sharp.cache(false)`.
   - Sharp reads file contents via in-memory buffers (`fs.readFileSync`), preventing persistent file handles and `EBUSY` locks during development.

4. **Performance & Asset Pipeline**:
   - WebP format enforced with a `< 250 KB` per slide performance budget (quality 80, effort 6).
   - High-resolution master source PNG files are backed up in [`docs/banners/`](file:///d:/SpeedyMeals/speedymeals/docs/banners/).

## Consequence
- Zero code modifications needed when adding or replacing banner slides — dropping a new `.webp` and updating `banners.json` automatically activates the slide.
- Completely eliminates Windows file handle locks during live development.
- Guaranteed LCP performance and layout stability with unified 2.8:1 aspect ratio containers.
