/* ==========================================================
   LakiWin Gaming Photobooth — script.js
   Everything runs in the browser: no backend, no API keys.
   ========================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     Constants
     --------------------------------------------------------- */
  const Y = '#FBD605';      // LakiWin yellow (sampled from the logo)
  const INK = '#221F1F';    // LakiWin black (sampled from the logo)
  const WHITE = '#FFFFFF';

  const DISPLAY_FONT = '"Bungee", "Arial Black", Impact, sans-serif';
  const BODY_FONT = '"Rubik", "Segoe UI", Arial, sans-serif';

  const TOTAL_SHOTS = 4;
  const PHOTO_ASPECT = 4 / 3;
  const MAX_TEXT = 22;

  const LOGO_SRC = {
    main: 'assets/lakiwin-logo.png',
    flat: 'assets/lakiwin-logo-flat.png'
  };

  const PROMPTS = [
    'Strike your pose!',
    'Now show us your game face!',
    'Big winning smile!',
    'Last one. Make it legendary!'
  ];

  const FILTER_NAMES = {
    original: 'Original',
    bright: 'Bright',
    warm: 'Warm',
    cool: 'Cool',
    grayscale: 'Grayscale',
    gaming: 'Gaming',
    contrast: 'High Contrast'
  };

  /* ---------------------------------------------------------
     DOM helpers + elements
     --------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const el = {
    topbar: $('#topbar'),
    steps: $$('.steps li'),
    homeBtn: $('#homeBtn'),
    soundBtn: $('#soundBtn'),
    live: $('#live'),

    startBtn: $('#startBtn'),

    video: $('#video'),
    preview: $('#preview'),
    vfFilter: $('#vfFilter'),
    countdown: $('#countdownNum'),
    flash: $('#flash'),
    toast: $('#toast'),
    toastImg: $('#toastImg'),
    toastTitle: $('#toastTitle'),
    toastSub: $('#toastSub'),
    camMessage: $('#camMessage'),
    camMessageTitle: $('#camMessageTitle'),
    camMessageText: $('#camMessageText'),
    retryBtn: $('#retryBtn'),
    counter: $('#counter'),
    counterNum: $('#counterNum'),
    prompt: $('#prompt'),
    slots: $$('#shots .slot'),
    captureBtn: $('#captureBtn'),
    captureLabel: $('#captureLabel'),

    reviewGrid: $('#reviewGrid'),
    retakeBtn: $('#retakeBtn'),
    toCustomizeBtn: $('#toCustomizeBtn'),

    stripPreview: $('#stripPreview'),
    customText: $('#customText'),
    textCount: $('#textCount'),
    generateBtn: $('#generateBtn'),
    generateError: $('#generateError'),
    backToReviewBtn: $('#backToReviewBtn'),

    resultImg: $('#resultImg'),
    fileName: $('#fileName'),
    downloadBtn: $('#downloadBtn'),
    againBtn: $('#againBtn'),
    editBtn: $('#editBtn')
  };

  const screens = {
    welcome: $('#screen-welcome'),
    camera: $('#screen-camera'),
    review: $('#screen-review'),
    customize: $('#screen-customize'),
    result: $('#screen-result')
  };

  const STEP_FOR_SCREEN = { camera: 'shoot', review: 'review', customize: 'customize', result: 'download' };
  const STEP_ORDER = ['shoot', 'review', 'customize', 'download'];

  /* ---------------------------------------------------------
     App state
     --------------------------------------------------------- */
  const state = {
    screen: 'welcome',
    stream: null,
    raf: 0,
    session: 0,          // bumps whenever the camera session ends (cancels running timers)
    shooting: false,
    photos: [],          // raw, unfiltered captures (canvas elements, 4:3)
    filter: 'original',
    filteredCache: new Map(),
    theme: 'yellow',
    text: '',
    badge: 'none',
    sound: true,
    resultUrl: null,
    resultName: ''
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const announce = (msg) => { el.live.textContent = ''; setTimeout(() => { el.live.textContent = msg; }, 30); };

  /* ---------------------------------------------------------
     Icon library
     One set of vector paths (100 x 100 grid) used for BOTH the
     website stickers (SVG) and the downloaded strip (Canvas),
     so the graphics always match.
     --------------------------------------------------------- */
  const circle = (cx, cy, r) =>
    `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;

  const STAR = 'M50 6L61.2 34.6L91.8 36.4L68.1 55.9L75.9 85.6L50 69L24.1 85.6L31.9 55.9L8.2 36.4L38.8 34.6Z';
  const SMALL_STAR = 'M50 34L54.1 44.3L65.2 45.1L56.7 52.2L59.4 62.9L50 57L40.6 62.9L43.3 52.2L34.8 45.1L45.9 44.3Z';
  const LEAF = 'M50 50C41 43 28 34 31 21C33 12 44 11 50 20C56 11 67 12 69 21C72 34 59 43 50 50Z';
  const SLOT_TILE = 'M20 16H88Q95 16 94 23L88 78Q87 85 80 85H12Q5 85 6 78L12 23Q13 16 20 16Z';
  const SLOT_INNER = 'M24 24H83Q87 24 86.5 28L81.5 73Q81 77 77 77H17Q13 77 13.5 73L18.5 28Q19 24 24 24Z';

  // Layer: { d, fill: role, line: true }  |  { d, stroke: role, w }  |  { text, x, y, size, fill, maxW, skew }
  // Roles: main (yellow), ink (black), paper (white). "line" adds the black outline.
  const ICONS = {
    star: [
      { d: STAR, fill: 'main', line: true }
    ],
    sparkle: [
      { d: 'M50 4C54 36 64 46 96 50C64 54 54 64 50 96C46 64 36 54 4 50C36 46 46 36 50 4Z', fill: 'main', line: true }
    ],
    coin: [
      { d: circle(50, 50, 44), fill: 'main', line: true },
      { d: circle(50, 50, 32), stroke: 'ink', w: 4 },
      { d: SMALL_STAR, fill: 'ink' },
      { d: 'M12.5 44A38.5 38.5 0 0 1 31 16.5', stroke: 'paper', w: 5 }
    ],
    crown: [
      { d: 'M15 72L9 30L31 50L50 19L69 50L91 30L85 72Z', fill: 'main', line: true },
      { d: 'M14 68H86Q90 68 90 72V80Q90 85 85 85H15Q10 85 10 80V72Q10 68 14 68Z', fill: 'main', line: true },
      { d: circle(9, 28, 6), fill: 'main', line: true },
      { d: circle(50, 15, 7), fill: 'main', line: true },
      { d: circle(91, 28, 6), fill: 'main', line: true },
      { d: circle(32, 76.5, 3.6), fill: 'ink' },
      { d: circle(50, 76.5, 4.4), fill: 'ink' },
      { d: circle(68, 76.5, 3.6), fill: 'ink' }
    ],
    clover: [
      { d: 'M54 54Q70 66 76 90', stroke: 'ink', w: 8 },
      { d: LEAF, fill: 'main', line: true, rot: 0 },
      { d: LEAF, fill: 'main', line: true, rot: 90 },
      { d: LEAF, fill: 'main', line: true, rot: 180 },
      { d: LEAF, fill: 'main', line: true, rot: 270 },
      { d: circle(50, 50, 4), fill: 'ink' }
    ],
    bell: [
      { d: circle(50, 11, 6), fill: 'main', line: true },
      { d: circle(50, 86, 8), fill: 'main', line: true },
      { d: 'M50 15C34 15 27 28 27 43V58C27 65 22 69 16 74H84C78 69 73 65 73 58V43C73 28 66 15 50 15Z', fill: 'main', line: true },
      { d: 'M14 72H86Q91 72 91 77Q91 82 86 82H14Q9 82 9 77Q9 72 14 72Z', fill: 'main', line: true },
      { d: 'M38 30Q35 38 35.5 52', stroke: 'paper', w: 5 }
    ],
    reel777: [
      { d: SLOT_TILE, fill: 'ink', line: true },
      { d: SLOT_INNER, stroke: 'main', w: 3 },
      { text: '777', x: 50, y: 62, size: 31, fill: 'main', maxW: 60, skew: -0.1 }
    ],
    calendar: [
      { d: 'M16 22H84Q92 22 92 30V82Q92 90 84 90H16Q8 90 8 82V30Q8 22 16 22Z', fill: 'paper', line: true },
      { d: 'M8 30Q8 22 16 22H84Q92 22 92 30V42H8Z', fill: 'main', line: true },
      { d: 'M28 8Q33 8 33 13V30Q33 35 28 35Q23 35 23 30V13Q23 8 28 8Z', fill: 'ink' },
      { d: 'M72 8Q77 8 77 13V30Q77 35 72 35Q67 35 67 30V13Q67 8 72 8Z', fill: 'ink' },
      { d: 'M20 52H34V63H20Z', fill: 'ink' },
      { d: 'M43 52H57V63H43Z', fill: 'ink' },
      { d: 'M66 52H80V63H66Z', fill: 'ink' },
      { d: 'M20 70H34V81H20Z', fill: 'ink' },
      { d: 'M43 70H57V81H43Z', fill: 'ink' },
      { d: 'M66 70H80V81H66Z', fill: 'main', line: true }
    ]
  };

  const OUTLINE = 5;   // black outline width (icon units)
  const RIM = 9;       // white sticker rim width (icon units)

  /* ---------- SVG version (website stickers) ---------- */
  function iconSVG(name, { rim = true } = {}) {
    const layers = ICONS[name];
    if (!layers) return '';
    const tf = (l) => (l.rot ? ` transform="rotate(${l.rot} 50 50)"` : '');
    const parts = [];

    if (rim) {
      for (const l of layers) {
        if (l.text) continue;
        if (l.fill) {
          parts.push(`<path d="${l.d}" fill="var(--ic-rim)" stroke="var(--ic-rim)" stroke-width="${(l.line ? OUTLINE : 0) + RIM * 2}"${tf(l)}/>`);
        } else if (l.stroke) {
          parts.push(`<path d="${l.d}" fill="none" stroke="var(--ic-rim)" stroke-width="${l.w + RIM * 2}"${tf(l)}/>`);
        }
      }
    }
    for (const l of layers) {
      if (l.text) {
        const skewDeg = Math.atan(l.skew || 0) * 180 / Math.PI;
        parts.push(
          `<g transform="translate(${l.x} ${l.y}) skewX(${skewDeg.toFixed(2)})">` +
          `<text x="0" y="0" text-anchor="middle" font-family="Bungee, 'Arial Black', Impact, sans-serif" font-size="${l.size}" ` +
          `fill="var(--ic-${l.fill})" textLength="${l.maxW}" lengthAdjust="spacingAndGlyphs">${l.text}</text></g>`
        );
      } else if (l.fill) {
        const line = l.line ? ` stroke="var(--ic-ink)" stroke-width="${OUTLINE}"` : '';
        parts.push(`<path d="${l.d}" fill="var(--ic-${l.fill})"${line}${tf(l)}/>`);
      } else if (l.stroke) {
        parts.push(`<path d="${l.d}" fill="none" stroke="var(--ic-${l.stroke})" stroke-width="${l.w}"${tf(l)}/>`);
      }
    }
    return `<svg viewBox="-16 -16 132 132" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true" focusable="false">${parts.join('')}</svg>`;
  }

  function mountStickers() {
    $$('[data-icon]').forEach((node) => {
      node.innerHTML = iconSVG(node.dataset.icon);
    });
  }

  /* ---------- Canvas version (downloaded strip) ---------- */
  const pathCache = new Map();
  const getPath = (d) => {
    let p = pathCache.get(d);
    if (!p) { p = new Path2D(d); pathCache.set(d, p); }
    return p;
  };

  function paintIcon(ctx, layers, pal, rim) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const withRot = (l, fn) => {
      if (!l.rot) { fn(); return; }
      ctx.save();
      ctx.translate(50, 50);
      ctx.rotate(l.rot * Math.PI / 180);
      ctx.translate(-50, -50);
      fn();
      ctx.restore();
    };

    if (rim && pal.rim) {
      ctx.fillStyle = pal.rim;
      ctx.strokeStyle = pal.rim;
      for (const l of layers) {
        if (l.text) continue;
        withRot(l, () => {
          const p = getPath(l.d);
          if (l.fill) {
            ctx.lineWidth = (l.line ? OUTLINE : 0) + RIM * 2;
            ctx.fill(p);
            ctx.stroke(p);
          } else if (l.stroke) {
            ctx.lineWidth = l.w + RIM * 2;
            ctx.stroke(p);
          }
        });
      }
    }

    for (const l of layers) {
      if (l.text) {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.transform(1, 0, l.skew || 0, 1, 0, 0);
        ctx.font = `${l.size}px ${DISPLAY_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        const w = ctx.measureText(l.text).width;
        if (l.maxW && w > 0) ctx.scale(l.maxW / w, 1);
        ctx.fillStyle = pal[l.fill];
        ctx.fillText(l.text, 0, 0);
        ctx.restore();
        continue;
      }
      withRot(l, () => {
        const p = getPath(l.d);
        if (l.fill) {
          ctx.fillStyle = pal[l.fill];
          ctx.fill(p);
          if (l.line) {
            ctx.strokeStyle = pal.ink;
            ctx.lineWidth = OUTLINE;
            ctx.stroke(p);
          }
        } else if (l.stroke) {
          ctx.strokeStyle = pal[l.stroke];
          ctx.lineWidth = l.w;
          ctx.stroke(p);
        }
      });
    }
  }

  const STICKER_PAL = { main: Y, ink: INK, paper: WHITE, rim: WHITE };
  const iconCache = new Map();

  function iconCanvas(name, size, pal, rim) {
    const key = `${name}|${size}|${pal.main}|${pal.ink}|${pal.paper}|${pal.rim}|${rim}`;
    if (iconCache.has(key)) return iconCache.get(key);
    const pad = Math.ceil(size * 0.2);
    const dim = Math.ceil(size + pad * 2);
    const c = document.createElement('canvas');
    c.width = dim;
    c.height = dim;
    const x = c.getContext('2d');
    x.translate(pad, pad);
    x.scale(size / 100, size / 100);
    paintIcon(x, ICONS[name], pal, rim);
    iconCache.set(key, c);
    return c;
  }

  function drawSticker(ctx, name, cx, cy, size, rot = 0, { pal = STICKER_PAL, rim = true, shadow = true } = {}) {
    const c = iconCanvas(name, size, pal, rim);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot * Math.PI / 180);
    if (shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.24)';
      ctx.shadowOffsetY = Math.max(3, size * 0.05);
      ctx.shadowBlur = Math.max(2, size * 0.04);
    }
    ctx.drawImage(c, -c.width / 2, -c.height / 2);
    ctx.restore();
  }

  /* ---------------------------------------------------------
     Canvas shape helpers
     --------------------------------------------------------- */
  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // Parallelogram leaning like the LakiWin slot tiles
  const slantPts = (x, y, w, h, s) => [[x + s, y], [x + w, y], [x + w - s, y + h], [x, y + h]];

  function roundPolyPath(ctx, pts, r) {
    const n = pts.length;
    const a = pts[n - 1];
    const b = pts[0];
    ctx.beginPath();
    ctx.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % n];
      ctx.arcTo(p[0], p[1], q[0], q[1], r);
    }
    ctx.closePath();
  }

  const setSpacing = (ctx, v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = v; };

  function fitFontSize(ctx, text, fontFn, max, min, maxW) {
    let size = max;
    while (size > min) {
      ctx.font = fontFn(size);
      if (ctx.measureText(text).width <= maxW) break;
      size -= 2;
    }
    ctx.font = fontFn(size);
    return size;
  }

  /* ---------------------------------------------------------
     Filters (real pixel processing on Canvas)
     --------------------------------------------------------- */
  const lut = (fn) => {
    const t = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) t[i] = fn(i);
    return t;
  };
  const contrast = (k) => (v) => (v - 128) * k + 128;

  const FILTERS = {
    original: null,
    bright: { r: lut((v) => 255 * Math.pow(v / 255, 0.8) + 6) },
    warm: { r: lut((v) => v * 1.05 + 14), g: lut((v) => v * 1.01 + 5), b: lut((v) => v * 0.86) },
    cool: { r: lut((v) => v * 0.9), g: lut((v) => v * 0.99 + 4), b: lut((v) => v * 1.07 + 16) },
    grayscale: { gray: true, r: lut(contrast(1.06)) },
    gaming: {
      sat: 1.35,
      r: lut((v) => contrast(1.14)(v) + 10),
      g: lut((v) => contrast(1.14)(v) + 3),
      b: lut((v) => contrast(1.14)(v) - 14),
      vignette: 0.34
    },
    contrast: { sat: 1.08, r: lut(contrast(1.45)) }
  };

  function processPixels(data, f) {
    const R = f.r;
    const G = f.g || f.r;
    const B = f.b || f.r;
    const sat = f.sat || 0;
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      if (f.gray) {
        const yv = (r * 77 + g * 150 + b * 29) >> 8;
        const o = R[yv];
        data[i] = o; data[i + 1] = o; data[i + 2] = o;
        continue;
      }
      if (sat) {
        const yv = (r * 77 + g * 150 + b * 29) >> 8;
        r = yv + (r - yv) * sat;
        g = yv + (g - yv) * sat;
        b = yv + (b - yv) * sat;
        r = r < 0 ? 0 : r > 255 ? 255 : r | 0;
        g = g < 0 ? 0 : g > 255 ? 255 : g | 0;
        b = b < 0 ? 0 : b > 255 ? 255 : b | 0;
      }
      data[i] = R[r];
      data[i + 1] = G[g];
      data[i + 2] = B[b];
    }
  }

  function vignette(ctx, w, h, strength) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.38, w / 2, h / 2, Math.hypot(w, h) / 2);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function applyFilterToContext(ctx, w, h, name) {
    const f = FILTERS[name];
    if (!f) return;
    const img = ctx.getImageData(0, 0, w, h);
    processPixels(img.data, f);
    ctx.putImageData(img, 0, 0);
    if (f.vignette) vignette(ctx, w, h, f.vignette);
  }

  function filteredCopy(src, name) {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(src, 0, 0);
    applyFilterToContext(x, c.width, c.height, name);
    return c;
  }

  function filteredPhotos(name) {
    if (!state.filteredCache.has(name)) {
      state.filteredCache.set(name, state.photos.map((p) => (name === 'original' ? p : filteredCopy(p, name))));
    }
    return state.filteredCache.get(name);
  }

  function thumbURL(src, name, width = 240) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = Math.round(width / PHOTO_ASPECT);
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(src, 0, 0, c.width, c.height);
    applyFilterToContext(x, c.width, c.height, name);
    return c.toDataURL('image/jpeg', 0.85);
  }

  /* ---------------------------------------------------------
     Fonts + logo loading
     --------------------------------------------------------- */
  let fontsReady = null;
  function ensureFonts() {
    if (!fontsReady) {
      fontsReady = (async () => {
        if (!document.fonts || !document.fonts.load) return;
        try {
          await Promise.race([
            Promise.all([
              document.fonts.load('60px "Bungee"'),
              document.fonts.load('800 40px "Rubik"'),
              document.fonts.load('700 40px "Rubik"')
            ]),
            sleep(3000)
          ]);
        } catch (e) { /* fall back to system fonts */ }
        iconCache.clear();
      })();
    }
    return fontsReady;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load ${src}`));
      img.src = src;
    });
  }

  let logosReady = null;
  const EMBEDDED = () => window.LAKIWIN_LOGO_DATA || null;

  // Try the PNG in /assets first; if it can't be found, use the backup copy in logo-data.js.
  async function loadLogoVariant(variant) {
    const emb = EMBEDDED();
    // On file:// the embedded copy is required, because Canvas can't export local files there.
    if (location.protocol === 'file:' && emb) return loadImage(emb[variant]);
    try {
      return await loadImage(LOGO_SRC[variant]);
    } catch (err) {
      if (emb) return loadImage(emb[variant]);
      throw err;
    }
  }

  function loadLogos() {
    if (!logosReady) {
      logosReady = Promise.all([loadLogoVariant('main'), loadLogoVariant('flat').catch(() => null)])
        .then(([main, flat]) => ({ main, flat: flat || main }));
      logosReady.catch(() => { logosReady = null; });
    }
    return logosReady;
  }

  // Website logos: swap to the backup copy if the PNG fails to load
  function protectLogoImages() {
    $$('img.js-logo').forEach((img) => {
      const useBackup = () => {
        const emb = EMBEDDED();
        if (emb && img.src !== emb.main) img.src = emb.main;
      };
      img.addEventListener('error', useBackup, { once: true });
      if (img.complete && img.naturalWidth === 0) useBackup();
    });
  }

  /* ---------------------------------------------------------
     Date
     --------------------------------------------------------- */
  function todayInfo() {
    const now = new Date();
    const label = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    const pad = (n) => String(n).padStart(2, '0');
    const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    return { label, iso };
  }

  /* ---------------------------------------------------------
     Strip themes
     --------------------------------------------------------- */
  const THEMES = {
    yellow: {
      bg: Y, border: INK, bulb: WHITE, bulbLine: INK, rays: 'rgba(255,255,255,0.42)',
      frame: INK, frameShadow: 'rgba(34,31,31,0.22)',
      ribbonBg: INK, ribbonFg: WHITE, ribbonLine: null,
      textFill: INK, textShadow: WHITE,
      pillBg: INK, pillFg: WHITE,
      rule: 'rgba(34,31,31,0.45)',
      badgeBg: INK, badgeFg: Y,
      logo: 'main'
    },
    black: {
      bg: '#1B1818', border: Y, bulb: Y, bulbLine: null, rays: 'rgba(251,214,5,0.10)',
      frame: Y, frameShadow: 'rgba(0,0,0,0.6)',
      ribbonBg: Y, ribbonFg: INK, ribbonLine: null,
      textFill: Y, textShadow: '#000000',
      pillBg: Y, pillFg: INK,
      rule: 'rgba(251,214,5,0.55)',
      badgeBg: Y, badgeFg: INK,
      logo: 'main'
    },
    white: {
      bg: WHITE, border: INK, bulb: Y, bulbLine: INK, rays: 'rgba(251,214,5,0.32)',
      frame: INK, frameShadow: Y,
      ribbonBg: Y, ribbonFg: INK, ribbonLine: INK,
      textFill: INK, textShadow: Y,
      pillBg: INK, pillFg: Y,
      rule: 'rgba(34,31,31,0.3)',
      badgeBg: Y, badgeFg: INK,
      logo: 'flat'
    }
  };

  /* ---------------------------------------------------------
     Strip decorations
     --------------------------------------------------------- */
  function drawRayBurst(ctx, W, H, cx, cy, radius, color) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = color;
    const count = 36;
    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i += 2) {
      x.beginPath();
      x.moveTo(cx, cy);
      x.arc(cx, cy, radius, i * step, (i + 1) * step);
      x.closePath();
      x.fill();
    }
    // soft fade toward the edges
    x.globalCompositeOperation = 'destination-in';
    const g = x.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    ctx.drawImage(c, 0, 0);
  }

  function drawBulbs(ctx, W, H, inset, T) {
    const spacing = 60;
    const edges = [
      [inset, inset, W - inset, inset],
      [W - inset, inset, W - inset, H - inset],
      [W - inset, H - inset, inset, H - inset],
      [inset, H - inset, inset, inset]
    ];
    for (const [x1, y1, x2, y2] of edges) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const n = Math.max(1, Math.round(len / spacing));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        ctx.beginPath();
        ctx.arc(x, y, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = T.bulb;
        ctx.fill();
        if (T.bulbLine) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = T.bulbLine;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(x - 2.2, y - 2.2, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();
      }
    }
  }

  function drawBadge(ctx, label, rightX, cy, rot, T) {
    const fontSize = 54;
    const font = `${fontSize}px ${DISPLAY_FONT}`;
    const m = document.createElement('canvas').getContext('2d');
    m.font = font;
    const tw = m.measureText(label).width;
    const h = 106;
    const s = 14;
    const w = tw + 84 + s;
    const pad = 34;

    const c = document.createElement('canvas');
    c.width = Math.ceil(w + pad * 2);
    c.height = Math.ceil(h + pad * 2);
    const x = c.getContext('2d');
    x.translate(pad, pad);
    x.lineJoin = 'round';

    const pts = slantPts(0, 0, w, h, s);
    roundPolyPath(x, pts, 18);
    x.strokeStyle = WHITE;
    x.lineWidth = 22;
    x.stroke();
    roundPolyPath(x, pts, 18);
    x.fillStyle = T.badgeBg;
    x.fill();
    x.strokeStyle = INK;
    x.lineWidth = 6;
    x.stroke();

    roundPolyPath(x, slantPts(13, 13, w - 26, h - 26, s * (h - 26) / h), 11);
    x.strokeStyle = T.badgeFg;
    x.globalAlpha = 0.55;
    x.lineWidth = 2.5;
    x.stroke();
    x.globalAlpha = 1;

    x.save();
    x.translate(w / 2, h / 2 + 3);
    x.transform(1, 0, -0.12, 1, 0, 0);
    x.font = font;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = T.badgeFg;
    x.fillText(label, 0, 0);
    x.restore();

    const cx = rightX - w / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot * Math.PI / 180);
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowOffsetY = 7;
    ctx.shadowBlur = 5;
    ctx.drawImage(c, -c.width / 2, -c.height / 2);
    ctx.restore();

    // little star accent on the badge corner
    const a = rot * Math.PI / 180;
    const lx = w / 2 - 4;
    const ly = -h / 2 + 2;
    drawSticker(ctx, 'star', cx + lx * Math.cos(a) - ly * Math.sin(a), cy + lx * Math.sin(a) + ly * Math.cos(a), 54, 14);
  }

  /* ---------------------------------------------------------
     Render the final photo strip (Canvas)
     --------------------------------------------------------- */
  async function renderStrip(canvas, opts) {
    await ensureFonts();
    const logos = await loadLogos();
    const T = THEMES[opts.theme] || THEMES.yellow;
    const photos = filteredPhotos(opts.filter);
    const date = todayInfo();
    const text = (opts.text || '').trim().slice(0, MAX_TEXT);

    // ---- layout (all values in pixels; strip is 1200 px wide)
    const W = 1200;
    const SIDE = 100;
    const PW = 1000;
    const PH = PW / PHOTO_ASPECT;   // 750
    const GAP = 44;
    const TOP = 424;
    const photosBottom = TOP + PH * TOTAL_SHOTS + GAP * (TOTAL_SHOTS - 1);

    const logoImg = T.logo === 'flat' ? logos.flat : logos.main;
    const ratio = logoImg.naturalHeight / logoImg.naturalWidth;

    const headLogoW = 840;
    const headLogoH = headLogoW * ratio;
    const headLogoY = 168;
    const ribbonCY = headLogoY + headLogoH + 40;

    const footLogoW = 600;
    const footLogoH = footLogoW * ratio;
    const footLogoY = photosBottom + 120;
    let cursor = footLogoY + footLogoH;
    let textY = null;
    if (text) {
      textY = cursor + 95;
      cursor = textY + 50;
    }
    const dateCY = cursor + 85;
    const decoY = dateCY + 39 + 64;
    const H = Math.round(decoY + 92);

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // ---- background
    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, W, H);
    drawRayBurst(ctx, W, H, W / 2, 244, 640, T.rays);
    drawRayBurst(ctx, W, H, W / 2, footLogoY + footLogoH / 2, 520, T.rays);

    // ---- outer border + marquee bulbs
    roundRectPath(ctx, 16, 16, W - 32, H - 32, 34);
    ctx.lineWidth = 6;
    ctx.strokeStyle = T.border;
    ctx.stroke();
    drawBulbs(ctx, W, H, 46, T);

    // ---- header
    drawSticker(ctx, 'crown', W / 2, 112, 112, 0);
    drawSticker(ctx, 'coin', 158, 124, 84, -14);
    drawSticker(ctx, 'sparkle', 250, 104, 40, 0);
    drawSticker(ctx, 'star', 1042, 122, 84, 12);
    drawSticker(ctx, 'sparkle', 950, 104, 40, 0);

    ctx.drawImage(logoImg, (W - headLogoW) / 2, headLogoY, headLogoW, headLogoH);

    // "GAMING PHOTOBOOTH" ribbon
    ctx.save();
    ctx.font = `30px ${DISPLAY_FONT}`;
    setSpacing(ctx, '5px');
    const ribbonText = 'GAMING PHOTOBOOTH';
    const rtw = ctx.measureText(ribbonText).width;
    const rh = 58;
    const rs = 10;
    const rw = rtw + 72 + rs;
    const rx = W / 2 - rw / 2;
    const ry = ribbonCY - rh / 2;
    roundPolyPath(ctx, slantPts(rx, ry, rw, rh, rs), 14);
    ctx.fillStyle = T.ribbonBg;
    ctx.fill();
    if (T.ribbonLine) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = T.ribbonLine;
      ctx.stroke();
    }
    ctx.fillStyle = T.ribbonFg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ribbonText, W / 2 + 2.5, ribbonCY + 2);
    ctx.restore();
    drawSticker(ctx, 'sparkle', rx - 34, ribbonCY, 40, 0);
    drawSticker(ctx, 'sparkle', rx + rw + 34, ribbonCY, 40, 0);

    // ---- photos
    for (let i = 0; i < TOTAL_SHOTS; i++) {
      const x = SIDE;
      const y = TOP + i * (PH + GAP);
      if (T.frameShadow) {
        roundRectPath(ctx, x - 10 + 14, y - 10 + 16, PW + 20, PH + 20, 34);
        ctx.fillStyle = T.frameShadow;
        ctx.fill();
      }
      roundRectPath(ctx, x - 10, y - 10, PW + 20, PH + 20, 34);
      ctx.fillStyle = T.frame;
      ctx.fill();

      ctx.save();
      roundRectPath(ctx, x, y, PW, PH, 26);
      ctx.clip();
      const p = photos[i];
      if (p) {
        drawCover(ctx, p, x, y, PW, PH);
      } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, PW, PH);
      }
      ctx.restore();

      roundRectPath(ctx, x, y, PW, PH, 26);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.stroke();
    }

    // ---- stickers around the frames (edges + corners only, never over the middle of a photo)
    const j1 = TOP + PH + GAP / 2;
    const j2 = j1 + PH + GAP;
    const j3 = j2 + PH + GAP;
    drawSticker(ctx, 'reel777', 128, TOP + 4, 136, -10);
    drawSticker(ctx, 'sparkle', 1088, TOP + 8, 58, 0);
    drawSticker(ctx, 'clover', 100, j1, 96, -10);
    drawSticker(ctx, 'coin', 1100, j1, 86, 12);
    drawSticker(ctx, 'star', 100, j2, 88, -8);
    drawSticker(ctx, 'bell', 1100, j2, 96, 12);
    drawSticker(ctx, 'coin', 100, j3, 82, -14);
    drawSticker(ctx, 'clover', 1100, j3, 92, 10);
    drawSticker(ctx, 'star', 108, photosBottom - 6, 80, 10);

    if (opts.badge && opts.badge !== 'none') {
      drawBadge(ctx, opts.badge, 1108, photosBottom + 8, -7, T);
    } else {
      drawSticker(ctx, 'crown', 1094, photosBottom - 8, 86, 12);
    }

    // ---- footer: logo
    ctx.drawImage(logoImg, (W - footLogoW) / 2, footLogoY, footLogoW, footLogoH);

    // ---- footer: custom text
    if (text) {
      ctx.save();
      const size = fitFontSize(ctx, text, (s) => `${s}px ${DISPLAY_FONT}`, 92, 40, 820);
      const tw = ctx.measureText(text).width;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(W / 2, textY);
      ctx.transform(1, 0, -0.08, 1, 0, 0);
      ctx.fillStyle = T.textShadow;
      ctx.fillText(text, 5, 6);
      ctx.fillStyle = T.textFill;
      ctx.fillText(text, 0, 0);
      ctx.restore();
      const off = tw / 2 + 52;
      drawSticker(ctx, 'sparkle', W / 2 - off, textY - size * 0.12, 42, 0);
      drawSticker(ctx, 'sparkle', W / 2 + off, textY - size * 0.12, 42, 0);
    }

    // ---- footer: date pill with calendar icon
    ctx.save();
    ctx.font = `800 38px ${BODY_FONT}`;
    setSpacing(ctx, '3px');
    const dtw = ctx.measureText(date.label).width;
    const ph = 78;
    const ps = 12;
    const iconSize = 54;
    const pw = 40 + iconSize + 18 + dtw + 40 + ps;
    const px = W / 2 - pw / 2;
    const py = dateCY - ph / 2;
    roundPolyPath(ctx, slantPts(px, py, pw, ph, ps), 20);
    ctx.fillStyle = T.pillBg;
    ctx.fill();
    ctx.fillStyle = T.pillFg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(date.label, px + 40 + iconSize + 18, dateCY + 2);
    ctx.restore();
    drawSticker(ctx, 'calendar', px + 40 + iconSize / 2, dateCY, iconSize, -6, { rim: false, shadow: false });

    // ---- footer: small closing ornament
    ctx.save();
    ctx.strokeStyle = T.rule;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(W / 2 - 250, decoY); ctx.lineTo(W / 2 - 74, decoY);
    ctx.moveTo(W / 2 + 74, decoY); ctx.lineTo(W / 2 + 250, decoY);
    ctx.stroke();
    ctx.restore();
    drawSticker(ctx, 'sparkle', W / 2 - 46, decoY, 26, 0, { shadow: false });
    drawSticker(ctx, 'coin', W / 2, decoY, 46, 0, { shadow: false });
    drawSticker(ctx, 'sparkle', W / 2 + 46, decoY, 26, 0, { shadow: false });

    return { width: W, height: H, isoDate: date.iso, dateLabel: date.label };
  }

  function drawCover(ctx, src, x, y, w, h) {
    const sr = src.width / src.height;
    const dr = w / h;
    let sx = 0, sy = 0, sw = src.width, sh = src.height;
    if (sr > dr) { sw = src.height * dr; sx = (src.width - sw) / 2; }
    else if (sr < dr) { sh = src.width / dr; sy = (src.height - sh) / 2; }
    ctx.drawImage(src, sx, sy, sw, sh, x, y, w, h);
  }

  /* ---------------------------------------------------------
     Screens + progress
     --------------------------------------------------------- */
  function show(name) {
    if (state.screen === 'camera' && name !== 'camera') endCameraSession();

    Object.entries(screens).forEach(([key, node]) => { node.hidden = key !== name; });
    state.screen = name;
    document.body.dataset.screen = name;
    el.topbar.hidden = name === 'welcome';

    const current = STEP_FOR_SCREEN[name];
    const idx = STEP_ORDER.indexOf(current);
    el.steps.forEach((li, i) => {
      li.classList.toggle('is-active', i === idx);
      li.classList.toggle('is-done', idx > -1 && i < idx);
      if (i === idx) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });

    window.scrollTo(0, 0);
    const heading = screens[name].querySelector('h1, h2');
    if (heading && name !== 'welcome') {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  /* ---------------------------------------------------------
     Camera
     --------------------------------------------------------- */
  function setCamMessage(kind, title, text) {
    if (!kind) { el.camMessage.hidden = true; return; }
    el.camMessage.hidden = false;
    el.camMessageTitle.textContent = title;
    el.camMessageText.textContent = text;
    el.retryBtn.hidden = kind !== 'error';
    if (kind === 'error') el.retryBtn.focus();
  }

  function cameraErrorText(err) {
    const name = err && err.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return ['Camera access is blocked', 'Allow camera access in your browser (look for the camera icon in the address bar), then press Try again.'];
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return ['No camera found', 'Connect a webcam or check that your laptop camera is turned on, then press Try again.'];
    }
    if (name === 'NotReadableError' || name === 'AbortError') {
      return ['Camera is busy', 'Another app (like Zoom or Teams) may be using the camera. Close it, then press Try again.'];
    }
    return ['Camera could not start', 'Reload the page and allow camera access when your browser asks.'];
  }

  async function openCamera() {
    const session = state.session;
    el.captureBtn.disabled = true;
    setCamMessage('loading', 'Opening your camera…', 'Allow camera access when your browser asks.');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCamMessage('error', 'Camera not available here',
        'Your browser only allows the camera on secure pages. Open the site from GitHub Pages (https://) or a local server (http://localhost).');
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
    } catch (err) {
      try {
        // Retry with the simplest request (some cameras reject size hints)
        if (err && err.name === 'OverconstrainedError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw err;
        }
      } catch (err2) {
        if (session !== state.session) return;
        const [t, m] = cameraErrorText(err2);
        setCamMessage('error', t, m);
        return;
      }
    }

    // The visitor left the camera screen while the permission prompt was open
    if (session !== state.session || state.screen !== 'camera') {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    state.stream = stream;
    el.video.srcObject = stream;
    try { await el.video.play(); } catch (e) { /* autoplay is muted, so this rarely fails */ }
    await waitForVideo();
    if (session !== state.session) return;

    setCamMessage(null);
    el.captureBtn.disabled = false;
    startPreview();
    announce('Camera ready. Press Capture to start your 4 photos.');
  }

  function waitForVideo() {
    return new Promise((resolve) => {
      if (el.video.videoWidth > 0) { resolve(); return; }
      const done = () => { el.video.removeEventListener('loadedmetadata', done); resolve(); };
      el.video.addEventListener('loadedmetadata', done);
      setTimeout(done, 4000);
    });
  }

  function stopCamera() {
    cancelAnimationFrame(state.raf);
    state.raf = 0;
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
    }
    el.video.pause();
    el.video.srcObject = null;
  }

  function endCameraSession() {
    state.session += 1;       // cancels any countdown in progress
    state.shooting = false;
    stopCamera();
    hideCountdown();
    el.toast.hidden = true;
    el.captureLabel.textContent = 'CAPTURE';
    el.captureBtn.disabled = true;
  }

  function cropRect(vw, vh, aspect) {
    if (vw / vh > aspect) {
      const sw = vh * aspect;
      return { sx: (vw - sw) / 2, sy: 0, sw, sh: vh };
    }
    const sh = vw / aspect;
    return { sx: 0, sy: (vh - sh) / 2, sw: vw, sh };
  }

  const pctx = el.preview.getContext('2d', { willReadFrequently: true });

  function startPreview() {
    cancelAnimationFrame(state.raf);
    const draw = () => {
      if (!state.stream) return;
      const v = el.video;
      if (v.readyState >= 2 && v.videoWidth) {
        const w = el.preview.width;
        const h = el.preview.height;
        const { sx, sy, sw, sh } = cropRect(v.videoWidth, v.videoHeight, PHOTO_ASPECT);
        pctx.save();
        pctx.setTransform(-1, 0, 0, 1, w, 0);   // mirror, like a real mirror
        pctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
        pctx.restore();
        applyFilterToContext(pctx, w, h, state.filter);
      }
      state.raf = requestAnimationFrame(draw);
    };
    state.raf = requestAnimationFrame(draw);
  }

  function captureFrame() {
    const v = el.video;
    const { sx, sy, sw, sh } = cropRect(v.videoWidth, v.videoHeight, PHOTO_ASPECT);
    const outW = Math.round(Math.min(1280, sw));
    const outH = Math.round(outW / PHOTO_ASPECT);
    const c = document.createElement('canvas');
    c.width = outW;
    c.height = outH;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.setTransform(-1, 0, 0, 1, outW, 0);   // same mirror as the preview
    x.drawImage(v, sx, sy, sw, sh, 0, 0, outW, outH);
    return c;   // stored unfiltered; filter is applied when displayed / rendered
  }

  /* ---------------------------------------------------------
     Countdown + 4-photo sequence
     --------------------------------------------------------- */
  function showCount(text, isGo = false) {
    const n = el.countdown;
    n.textContent = text;
    n.classList.toggle('is-go', isGo);
    n.classList.remove('pop');
    void n.offsetWidth;   // restart the animation
    n.classList.add('pop');
  }
  function hideCountdown() {
    el.countdown.classList.remove('pop');
    el.countdown.textContent = '';
  }

  function flash() {
    el.flash.classList.remove('go');
    void el.flash.offsetWidth;
    el.flash.classList.add('go');
  }

  function setShot(i) {
    el.counterNum.textContent = String(i + 1);
    el.counter.setAttribute('aria-label', `Photo ${i + 1} of ${TOTAL_SHOTS}`);
    el.counterNum.classList.remove('bump');
    void el.counterNum.offsetWidth;
    el.counterNum.classList.add('bump');
    el.prompt.textContent = PROMPTS[i] || PROMPTS[0];
    el.slots.forEach((s, k) => s.classList.toggle('is-current', k === i));
  }

  function resetSlots() {
    el.slots.forEach((s, k) => {
      s.classList.remove('is-filled');
      s.classList.toggle('is-current', k === 0);
      s.innerHTML = `<span>${k + 1}</span>`;
    });
    el.counterNum.textContent = '1';
    el.counter.setAttribute('aria-label', `Photo 1 of ${TOTAL_SHOTS}`);
    el.prompt.textContent = PROMPTS[0];
  }

  function fillSlot(i) {
    const s = el.slots[i];
    if (!s || !state.photos[i]) return;
    s.classList.add('is-filled');
    s.innerHTML = `<img alt="Photo ${i + 1} of ${TOTAL_SHOTS}" src="${thumbURL(state.photos[i], state.filter, 200)}">`;
  }

  function refreshSlots() {
    state.photos.forEach((_, i) => fillSlot(i));
  }

  async function runSequence() {
    if (state.shooting || !state.stream) return;
    const session = state.session;
    const alive = () => session === state.session;

    state.shooting = true;
    state.photos = [];
    state.filteredCache.clear();
    resetSlots();
    el.captureBtn.disabled = true;
    el.captureLabel.textContent = 'SHOOTING…';
    unlockAudio();

    for (let i = 0; i < TOTAL_SHOTS; i++) {
      setShot(i);
      announce(`Photo ${i + 1} of ${TOTAL_SHOTS}. ${PROMPTS[i]}`);
      await sleep(i === 0 ? 350 : 550);
      if (!alive()) return;

      for (const n of ['3', '2', '1']) {
        showCount(n);
        beep(660, 0.12);
        await sleep(850);
        if (!alive()) return;
      }
      showCount('GO!', true);
      beep(1046, 0.22);
      await sleep(220);
      if (!alive()) return;

      const shot = captureFrame();
      flash();
      shutter();
      state.photos[i] = shot;
      fillSlot(i);

      el.toastImg.src = thumbURL(shot, state.filter, 208);
      el.toastTitle.textContent = 'PHOTO CAPTURED!';
      el.toastSub.textContent = `${i + 1} / ${TOTAL_SHOTS}`;
      el.toast.hidden = false;
      announce(`Photo captured. ${i + 1} of ${TOTAL_SHOTS}.`);

      await sleep(1250);
      if (!alive()) return;
      el.toast.hidden = true;
      hideCountdown();
    }

    // All four done
    el.toastImg.removeAttribute('src');
    el.toastTitle.textContent = 'ALL 4 PHOTOS CAPTURED!';
    el.toastSub.textContent = 'GG! Loading your review…';
    el.toast.hidden = false;
    beep(784, 0.12); setTimeout(() => beep(1046, 0.18), 120);
    await sleep(1000);
    if (!alive()) return;

    state.shooting = false;
    goReview();   // leaving the camera screen stops the webcam
  }

  /* ---------------------------------------------------------
     Sound (tiny synthesized blips, no audio files needed)
     --------------------------------------------------------- */
  let audioCtx = null;
  function unlockAudio() {
    if (!state.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { audioCtx = null; }
  }
  function beep(freq, dur, type = 'square', vol = 0.045) {
    if (!state.sound || !audioCtx) return;
    try {
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) { /* ignore */ }
  }
  function shutter() {
    if (!state.sound || !audioCtx) return;
    try {
      const t = audioCtx.currentTime;
      const len = Math.floor(audioCtx.sampleRate * 0.09);
      const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audioCtx.createBufferSource();
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.12, t);
      src.buffer = buf;
      src.connect(g).connect(audioCtx.destination);
      src.start(t);
    } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------
     Review
     --------------------------------------------------------- */
  function goReview() {
    const imgs = filteredPhotos(state.filter);
    el.reviewGrid.innerHTML = '';
    imgs.forEach((c, i) => {
      const li = document.createElement('li');
      li.innerHTML =
        `<figure class="review-card">` +
        `<span class="review-tag">${i + 1} / ${TOTAL_SHOTS}</span>` +
        `<img alt="Photo ${i + 1} of ${TOTAL_SHOTS}" src="${c.toDataURL('image/jpeg', 0.9)}">` +
        `</figure>`;
      el.reviewGrid.appendChild(li);
    });
    show('review');
  }

  /* ---------------------------------------------------------
     Customize
     --------------------------------------------------------- */
  function currentOptions() {
    return { theme: state.theme, text: state.text, badge: state.badge, filter: state.filter };
  }

  let previewTimer = 0;
  let previewToken = 0;
  function queuePreview(delay = 120) {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(async () => {
      const token = ++previewToken;
      try {
        // Render off-screen first so the visible preview never flashes empty
        const tmp = document.createElement('canvas');
        await renderStrip(tmp, currentOptions());
        if (token !== previewToken) return;
        const c = el.stripPreview;
        c.width = tmp.width;
        c.height = tmp.height;
        c.getContext('2d').drawImage(tmp, 0, 0);
        el.generateError.hidden = true;
      } catch (err) {
        showGenerateError(err);
      }
    }, delay);
  }

  function syncCustomizeInputs() {
    const set = (name, value) => {
      const input = $(`input[name="${name}"][value="${CSS.escape(value)}"]`);
      if (input) input.checked = true;
    };
    set('theme', state.theme);
    set('badge', state.badge);
    set('stripFilter', state.filter);
    el.customText.value = state.text;
    el.textCount.textContent = `${state.text.length} / ${MAX_TEXT}`;
  }

  function goCustomize() {
    syncCustomizeInputs();
    show('customize');
    queuePreview(0);
  }

  function showGenerateError(err) {
    console.error(err);
    const msg = (err && /load/i.test(err.message))
      ? 'The logo could not be loaded. Make sure assets/lakiwin-logo.png and logo-data.js are uploaded next to index.html.'
      : 'The strip could not be created. If you opened index.html straight from your computer, start a local server (see README) and try again.';
    el.generateError.textContent = msg;
    el.generateError.hidden = false;
  }

  async function generate() {
    el.generateBtn.disabled = true;
    const label = el.generateBtn.textContent;
    el.generateBtn.textContent = 'GENERATING…';
    el.generateError.hidden = true;
    try {
      const canvas = document.createElement('canvas');
      const meta = await renderStrip(canvas, currentOptions());
      const blob = await new Promise((resolve, reject) => {
        try {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png');
        } catch (e) { reject(e); }
      });
      if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
      state.resultUrl = URL.createObjectURL(blob);
      state.resultName = `lakiwin-photobooth-${meta.isoDate}.png`;
      el.resultImg.src = state.resultUrl;
      el.fileName.textContent = `File: ${state.resultName}`;
      show('result');
      beep(880, 0.1); setTimeout(() => beep(1320, 0.16), 110);
    } catch (err) {
      showGenerateError(err);
    } finally {
      el.generateBtn.disabled = false;
      el.generateBtn.textContent = label;
    }
  }

  function download() {
    if (!state.resultUrl) return;
    const a = document.createElement('a');
    a.href = state.resultUrl;
    a.download = state.resultName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    announce(`Downloading ${state.resultName}`);
  }

  /* ---------------------------------------------------------
     Session helpers
     --------------------------------------------------------- */
  function clearPhotos() {
    state.photos = [];
    state.filteredCache.clear();
    resetSlots();
  }

  function startCameraScreen() {
    clearPhotos();
    el.toast.hidden = true;
    el.captureLabel.textContent = 'CAPTURE';
    show('camera');
    openCamera();
  }

  function resetForNextGuest() {
    clearPhotos();
    state.text = '';
    state.badge = 'none';
    if (state.resultUrl) { URL.revokeObjectURL(state.resultUrl); state.resultUrl = null; }
    el.resultImg.removeAttribute('src');
  }

  /* ---------------------------------------------------------
     Events
     --------------------------------------------------------- */
  el.startBtn.addEventListener('click', () => { unlockAudio(); startCameraScreen(); });
  el.captureBtn.addEventListener('click', runSequence);
  el.retryBtn.addEventListener('click', () => {
    stopCamera();
    state.session += 1;
    openCamera();
  });

  el.homeBtn.addEventListener('click', () => {
    const hasWork = state.photos.length > 0 && state.screen !== 'result';
    if (hasWork && !window.confirm('Go back to the start? Your photos will be cleared.')) return;
    resetForNextGuest();
    show('welcome');
  });

  el.soundBtn.addEventListener('click', () => {
    state.sound = !state.sound;
    el.soundBtn.setAttribute('aria-pressed', String(state.sound));
    el.soundBtn.setAttribute('aria-label', state.sound ? 'Sound effects on. Press to mute.' : 'Sound effects off. Press to turn on.');
    if (state.sound) unlockAudio();
  });

  // Camera filter chips
  $$('input[name="filter"]').forEach((input) => {
    input.addEventListener('change', () => {
      state.filter = input.value;
      el.vfFilter.textContent = FILTER_NAMES[state.filter];
      refreshSlots();
    });
  });

  // Review
  el.retakeBtn.addEventListener('click', startCameraScreen);
  el.toCustomizeBtn.addEventListener('click', goCustomize);

  // Customize
  $$('input[name="theme"]').forEach((input) => {
    input.addEventListener('change', () => { state.theme = input.value; queuePreview(0); });
  });
  $$('input[name="badge"]').forEach((input) => {
    input.addEventListener('change', () => { state.badge = input.value; queuePreview(0); });
  });
  $$('input[name="stripFilter"]').forEach((input) => {
    input.addEventListener('change', () => {
      state.filter = input.value;
      const camInput = $(`input[name="filter"][value="${input.value}"]`);
      if (camInput) camInput.checked = true;
      el.vfFilter.textContent = FILTER_NAMES[state.filter];
      queuePreview(0);
    });
  });
  el.customText.addEventListener('input', () => {
    state.text = el.customText.value.slice(0, MAX_TEXT);
    el.textCount.textContent = `${state.text.length} / ${MAX_TEXT}`;
    queuePreview(160);
  });
  $$('.suggest').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.text = btn.dataset.text;
      el.customText.value = state.text;
      el.textCount.textContent = `${state.text.length} / ${MAX_TEXT}`;
      queuePreview(0);
    });
  });
  el.backToReviewBtn.addEventListener('click', goReview);
  el.generateBtn.addEventListener('click', generate);

  // Result
  el.downloadBtn.addEventListener('click', download);
  el.againBtn.addEventListener('click', () => { resetForNextGuest(); unlockAudio(); startCameraScreen(); });
  el.editBtn.addEventListener('click', goCustomize);

  // Keyboard: Space on the camera screen starts the sequence
  document.addEventListener('keydown', (e) => {
    if (state.screen !== 'camera' || e.repeat) return;
    if (e.code === 'Space' && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) {
      e.preventDefault();
      if (!el.captureBtn.disabled) runSequence();
    }
  });

  // Never leave the webcam running when the visitor leaves the page
  window.addEventListener('pagehide', stopCamera);
  window.addEventListener('beforeunload', stopCamera);

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  protectLogoImages();
  mountStickers();
  ensureFonts();
  loadLogos().catch(() => { /* reported when the strip is generated */ });
  show('welcome');
})();
