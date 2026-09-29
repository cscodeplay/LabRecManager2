'use strict';

/**
 * Obstacle Converter — turns whiteboard page objects into game-ready data.
 *
 * Classification:
 *   dark fill          → wall   (indestructible)
 *   colored fill ≤200  → breakable (1 HP)
 *   colored fill >200  → partial   (3 HP, fragments)
 *   small circle/star  → collectible (snake fruit / shooter pickup)
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DARK_COLORS = new Set([
  'black', '#000', '#000000', '#111', '#111111', '#222', '#222222',
  '#333', '#333333', '#444', '#444444', '#1e293b', '#0f172a', '#020617',
]);

function isDarkColor(c) {
  if (!c || c === 'transparent' || c === 'none') return false;
  const lc = c.toLowerCase().trim();
  if (DARK_COLORS.has(lc)) return true;
  // Parse hex brightness
  const hex = lc.replace('#', '');
  if (/^[0-9a-f]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r + g + b) / 3 < 68; // avg brightness < ~27%
  }
  if (/^[0-9a-f]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return (r + g + b) / 3 < 68;
  }
  return false;
}

function isSmall(w, h) {
  return Math.max(w, h) < 60;
}

function isLarge(w, h) {
  return Math.max(w, h) > 200;
}

function hasFill(fill) {
  return fill && fill !== 'transparent' && fill !== 'none' && fill !== 'rgba(0,0,0,0)';
}

let _uid = 0;
function uid() {
  return `go_${Date.now()}_${++_uid}`;
}

// ─── Main Converter ──────────────────────────────────────────────────────────

/**
 * @param {Object} opts
 * @param {Array}  opts.shapes   - pageShapeObjects[page]
 * @param {Array}  opts.texts    - pageTextObjects[page]
 * @param {Array}  opts.images   - pageImageObjects[page]
 * @param {number} opts.canvasW
 * @param {number} opts.canvasH
 * @returns {{ obstacles: Array, collectibles: Array }}
 */
export function convertToGameObjects({ shapes = [], texts = [], images = [], canvasW = 1920, canvasH = 1080 }) {
  const obstacles = [];
  const collectibles = [];

  // ── Shapes ──
  for (const s of shapes) {
    if (s.type === 'connector' || s.type === 'line') continue; // skip lines/connectors

    const x = s.x ?? 0;
    const y = s.y ?? 0;
    const w = Math.abs(s.width ?? 60);
    const h = Math.abs(s.height ?? 60);
    const fill = s.fillColor || s.color || '#6366f1';
    const stroke = s.color || '#6366f1';

    // Small circles/stars → collectible
    if (isSmall(w, h) && (s.type === 'circle' || s.type === 'star')) {
      collectibles.push({
        id: uid(),
        x: x + w / 2,
        y: y + h / 2,
        r: Math.max(w, h) / 2,
        color: fill !== 'transparent' ? fill : stroke,
        points: s.type === 'star' ? 30 : 10,
      });
      continue;
    }

    // Determine obstacle type
    let type = 'breakable';
    let hp = 1;
    if (isDarkColor(fill) || isDarkColor(stroke)) {
      type = 'wall';
      hp = Infinity;
    } else if (isLarge(w, h)) {
      type = 'partial';
      hp = 3;
    }

    obstacles.push({
      id: uid(),
      x,
      y,
      w,
      h,
      type,
      hp,
      maxHp: hp,
      color: hasFill(fill) ? fill : stroke,
      originalType: s.type || 'rectangle',
      shape: s.type === 'circle' ? 'circle' : 'rect',
    });
  }

  // ── Text objects → small walls ──
  for (const t of texts) {
    const x = t.x ?? 0;
    const y = t.y ?? 0;
    const w = t.width ?? 120;
    const h = t.height ?? 36;
    obstacles.push({
      id: uid(),
      x,
      y,
      w,
      h,
      type: 'wall',
      hp: Infinity,
      maxHp: Infinity,
      color: '#475569',
      originalType: 'text',
      shape: 'rect',
    });
  }

  // ── Image objects → walls ──
  for (const img of images) {
    const x = img.x ?? 0;
    const y = img.y ?? 0;
    const w = img.width ?? 100;
    const h = img.height ?? 100;
    obstacles.push({
      id: uid(),
      x,
      y,
      w,
      h,
      type: 'wall',
      hp: Infinity,
      maxHp: Infinity,
      color: '#64748b',
      originalType: 'image',
      shape: 'rect',
    });
  }

  return { obstacles, collectibles };
}

// ─── Random Obstacle Generator (for empty canvas) ────────────────────────────

/**
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {number} count   - base obstacle count
 * @param {number} level   - 1-10, increases density
 * @returns {Array} obstacles
 */
export function generateRandomObstacles(canvasW, canvasH, count = 12, level = 1) {
  const obstacles = [];
  const totalCount = count + Math.floor(level * 1.5);
  const margin = 80;

  for (let i = 0; i < totalCount; i++) {
    const w = 40 + Math.random() * 140;
    const h = 30 + Math.random() * 100;
    const x = margin + Math.random() * (canvasW - w - margin * 2);
    const y = margin + Math.random() * (canvasH - h - margin * 2);

    // 30% walls, 50% breakable, 20% partial
    const roll = Math.random();
    let type, hp, color;
    if (roll < 0.3) {
      type = 'wall';
      hp = Infinity;
      color = '#1e293b';
    } else if (roll < 0.8) {
      type = 'breakable';
      hp = 1;
      const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];
      color = colors[Math.floor(Math.random() * colors.length)];
    } else {
      type = 'partial';
      hp = 3;
      color = '#f97316';
    }

    obstacles.push({
      id: uid(),
      x, y, w, h,
      type, hp, maxHp: hp,
      color,
      originalType: 'rectangle',
      shape: Math.random() > 0.7 ? 'circle' : 'rect',
    });
  }

  return obstacles;
}
