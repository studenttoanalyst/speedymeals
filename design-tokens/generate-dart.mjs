#!/usr/bin/env node
// Generates mobile_app/lib/core/theme/app_tokens.dart from tokens.json.
// Run from the repo root:  node design-tokens/generate-dart.mjs
// Never edit the generated file by hand — edit tokens.json and re-run.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'));
const OUT = join(here, '..', 'mobile_app', 'lib', 'core', 'theme', 'app_tokens.dart');

const get = (path) => path.split('.').reduce((o, k) => o?.[k], tokens);
const resolve = (v) => {
  if (typeof v === 'string' && /^\{.+\}$/.test(v)) return resolve(get(v.slice(1, -1)).$value);
  return v;
};
const camel = (s) => s.replace(/[-.](\w)/g, (_, c) => c.toUpperCase());
const px = (v) => parseFloat(String(resolve(v)).replace('px', ''));
const hexToDart = (hex) => `Color(0xFF${hex.replace('#', '').toUpperCase()})`;

// ---- colors: flatten every leaf with a $value into a Dart name ----
const colorLines = [];
const walkColors = (node, prefix) => {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    const name = camel(prefix ? `${prefix}-${k}` : k);
    if (v && typeof v === 'object' && '$value' in v) {
      const doc = v.$description ? `  /// ${v.$description}\n` : '';
      colorLines.push(`${doc}  static const Color ${name} = ${hexToDart(resolve(v.$value))};`);
    } else if (v && typeof v === 'object') {
      walkColors(v, prefix ? `${prefix}-${k}` : k);
    }
  }
};
// brand.red.600 → red600; ink.50 → ink50; semantic.success → success; role.cta → cta
walkColors(tokens.color.brand, '');
walkColors({ ink: tokens.color.ink, green: tokens.color.green, amber: tokens.color.amber }, '');
colorLines.push(`  static const Color paper = ${hexToDart(tokens.color.paper.$value)};`);
colorLines.push(`  static const Color borderControl = ${hexToDart(tokens.color.border.control.$value)};`);
walkColors(tokens.color.semantic, '');
walkColors(tokens.color.role, '');

// ---- radius / spacing / sizes ----
// Numeric keys become s<N> (space.4 → s4); "0.5" → sHalf (Dart lowerCamelCase).
const numName = (k) => (k === '0.5' ? 'sHalf' : /^\d/.test(k) ? `s${k}` : camel(k));
const numClass = (name, node) =>
  Object.entries(node)
    .filter(([k]) => !k.startsWith('$'))
    .flatMap(([k, v]) =>
      '$value' in v
        ? [`  static const double ${numName(k)} = ${px(v.$value)};`]
        : numClass(name, v),
    );

const radius = numClass('AppRadius', tokens.radius);
const spacing = numClass('AppSpacing', tokens.space);
const sizes = numClass('AppSizes', tokens.size);

// ---- shadows: "0 1px 2px 0 rgba(21,23,26,0.06)" → BoxShadow ----
const shadowDart = (css) => {
  if (css === 'none') return '<BoxShadow>[]';
  const m = css.match(/^(-?\d+)(?:px)? (-?\d+)(?:px)? (\d+)(?:px)? (-?\d+)(?:px)? rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (!m) throw new Error(`Unsupported shadow: ${css}`);
  const [, x, y, blur, spread, r, g, b, a] = m;
  const alpha = Math.round(parseFloat(a) * 255).toString(16).padStart(2, '0').toUpperCase();
  const rgb = [r, g, b].map((n) => Number(n).toString(16).padStart(2, '0').toUpperCase()).join('');
  return `<BoxShadow>[BoxShadow(color: Color(0x${alpha}${rgb}), offset: Offset(${x}, ${y}), blurRadius: ${blur}, spreadRadius: ${spread})]`;
};
const shadows = Object.entries(tokens.shadow)
  .filter(([k]) => !k.startsWith('$'))
  .map(([k, v]) => `  static const List<BoxShadow> level${k} = ${shadowDart(v.$value)};`);

// ---- typography: em letter-spacing → logical px (Flutter has no em unit) ----
const familyName = (ref) => resolve(ref)[0];
const typeLines = Object.entries(tokens.typography)
  .filter(([k]) => !k.startsWith('$'))
  .map(([k, v]) => {
    const t = v.$value;
    const size = px(t.fontSize);
    const em = parseFloat(String(t.letterSpacing).replace('em', '')) || 0;
    const tracking = +(em * size).toFixed(3);
    const family = familyName(t.fontFamily);
    return `  static const TextStyle ${camel(k)} = TextStyle(fontFamily: '${family}', fontSize: ${size}, fontWeight: FontWeight.w${t.fontWeight}, height: ${t.lineHeight}, letterSpacing: ${tracking});`;
  });

const fonts = Object.entries(tokens.font.family)
  .filter(([k]) => !k.startsWith('$'))
  .map(([k, v]) => `  static const String ${k} = '${v.$value[0]}';`);

const durations = Object.entries(tokens.motion.duration)
  .filter(([k]) => !k.startsWith('$'))
  .map(([k, v]) => `  static const Duration ${k} = Duration(milliseconds: ${parseInt(v.$value, 10)});`);

const out = `// GENERATED FILE — DO NOT EDIT.
// Source: design-tokens/tokens.json (v${tokens.meta.version}).
// Regenerate: node design-tokens/generate-dart.mjs
// ignore_for_file: constant_identifier_names

import 'package:flutter/material.dart';

/// SpeedyMeals color tokens. Same values as the website's CSS variables.
abstract final class AppColors {
${colorLines.join('\n')}
}

/// Sharp radius policy: nothing between 8px and pill.
abstract final class AppRadius {
${radius.join('\n')}
}

/// 4px spacing scale + layout constants.
abstract final class AppSpacing {
${spacing.join('\n')}
}

abstract final class AppSizes {
${sizes.join('\n')}
}

/// Elevation: borders carry structure, shadows only signal lift.
abstract final class AppShadows {
${shadows.join('\n')}
}

abstract final class AppFonts {
${fonts.join('\n')}
}

/// Type scale. letterSpacing is in logical pixels (em × fontSize).
abstract final class AppTypography {
${typeLines.join('\n')}
}

abstract final class AppMotion {
  static const double pressScale = ${tokens.motion['press-scale'].$value};
${durations.join('\n')}
  static const Curve standard = Cubic(${tokens.motion.easing.standard.$value.join(', ')});
}
`;

writeFileSync(OUT, out);
console.log(`wrote ${OUT}`);
