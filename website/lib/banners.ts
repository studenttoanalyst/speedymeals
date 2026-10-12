import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Disable libvips file caching on Windows so files are never locked
sharp.cache(false);

export interface BannerOverlay {
  headline: string;
  subline?: string;
  ctaLabel?: string;
  persona?: 'rider' | 'restaurant' | 'customer';
}

export interface BannerSlide {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  href?: string;
  overlay?: BannerOverlay;
}

interface BannerManifestEntry {
  name?: string;
  file?: string;
  alt?: string;
  href?: string;
  overlay?: BannerOverlay;
}

/**
 * Server-only helper — reads one file per slide from public/assets/banners/.
 * Accepts .webp .avif .jpg .jpeg .png.
 * Skips files that end with -desktop or -mobile (legacy; kept for backward compat).
 * Sorts by filename (01-…, 02-…, …).
 * Reads intrinsic dimensions via sharp; warns in dev when ratio deviates >5% from 2.8:1.
 */
export async function getHeroBanners(): Promise<BannerSlide[]> {
  const bannersDir = path.join(process.cwd(), 'public/assets/banners');
  if (!fs.existsSync(bannersDir)) return [];

  const validExts = new Set(['.webp', '.avif', '.jpg', '.jpeg', '.png']);

  let allFiles: string[] = [];
  try {
    allFiles = fs.readdirSync(bannersDir);
  } catch (err) {
    console.error('[getHeroBanners] Cannot read banners dir:', err);
    return [];
  }

  // Load optional manifest
  let manifest: BannerManifestEntry[] = [];
  const manifestPath = path.join(bannersDir, 'banners.json');
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      console.warn('[getHeroBanners] banners.json parse error:', err);
    }
  }

  // Collect candidate files (skip legacy -desktop/-mobile suffix files)
  const candidates = allFiles.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    if (!validExts.has(ext)) return false;
    const stem = path.basename(f, ext);
    if (stem.endsWith('-desktop') || stem.endsWith('-mobile')) return false;
    return true;
  });

  // Sort numerically by filename
  candidates.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const TARGET_RATIO = 2.8;
  const RATIO_TOLERANCE = 0.05; // 5%

  const slides: BannerSlide[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const file = candidates[i];
    const ext = path.extname(file).toLowerCase();
    const stem = path.basename(file, ext);

    // Read intrinsic dimensions
    let width = 2800;
    let height = 1000;
    try {
      const buffer = fs.readFileSync(path.join(bannersDir, file));
      const meta = await sharp(buffer).metadata();
      if (meta.width && meta.height) {
        width = meta.width;
        height = meta.height;
      }
    } catch (err) {
      console.warn(`[getHeroBanners] sharp metadata error for ${file}:`, err);
    }

    // Dev-only ratio validation
    if (process.env.NODE_ENV !== 'production') {
      const ratio = width / height;
      const deviation = Math.abs(ratio - TARGET_RATIO) / TARGET_RATIO;
      if (deviation > RATIO_TOLERANCE) {
        console.warn(
          `[banners] ${file}: ratio ${ratio.toFixed(2)}:1 deviates ${(deviation * 100).toFixed(1)}% from target 2.8:1. ` +
            `Art will be letterboxed (object-contain). Target dimensions: e.g. 2800×1000px.`
        );
      }
    }

    // Match manifest entry by stem or numeric prefix
    const manifestEntry = manifest.find(
      (m) => m.name === stem || m.file === stem
    );

    slides.push({
      id: stem,
      src: `/assets/banners/${file}`,
      width,
      height,
      alt: manifestEntry?.alt ?? `Speedy Meals promotion ${i + 1}`,
      href: manifestEntry?.href,
      overlay: manifestEntry?.overlay,
    });
  }

  return slides;
}
