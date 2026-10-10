import { canvasTex, THREE } from './kit.js';

// Procedural textures for the interior. All drawn once and cached.

function noiseFill(ctx, w, h, base, amt, seed = 1) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < w * h * 0.02; i++) {
    ctx.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * amt})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

export function floorTex() {
  return canvasTex('floor', 512, 512, (ctx, w, h) => {
    const rows = 8;
    const rh = h / rows;
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < rows; y++) {
      let x = -r() * 200;
      while (x < w) {
        const len = 140 + r() * 160;
        const l = 52 + r() * 10;
        ctx.fillStyle = `hsl(${28 + r() * 6}, ${38 + r() * 10}%, ${l}%)`;
        ctx.fillRect(x, y * rh, len, rh);
        // grain
        for (let g = 0; g < 6; g++) {
          ctx.strokeStyle = `rgba(80,50,25,${0.05 + r() * 0.08})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          const gy = y * rh + r() * rh;
          ctx.moveTo(x, gy);
          ctx.bezierCurveTo(x + len * 0.3, gy + (r() - 0.5) * 6, x + len * 0.6, gy + (r() - 0.5) * 6, x + len, gy);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(60,35,20,0.55)';
        ctx.fillRect(x, y * rh, 2, rh);
        x += len;
      }
      ctx.fillStyle = 'rgba(60,35,20,0.45)';
      ctx.fillRect(0, y * rh, w, 2);
    }
  }, { repeat: [2, 1.5] });
}

export function wallpaperTex(tone = 'sage') {
  const tones = {
    sage: ['#a7b89c', '#98ab8d', '#b6c6aa'],
    cream: ['#e6dcc6', '#d9cdb4', '#efe6d2'],
    blue: ['#a9bccb', '#99adbd', '#b9cad6'],
  };
  const [base, dark, light] = tones[tone] || tones.sage;
  return canvasTex('wall-' + tone, 256, 256, (ctx, w, h) => {
    noiseFill(ctx, w, h, base, 0.05, 3);
    // soft vertical stripes
    for (let x = 0; x < w; x += 64) {
      ctx.fillStyle = light;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x + 24, 0, 16, h);
    }
    ctx.globalAlpha = 1;
    // tiny sprigs
    ctx.fillStyle = dark;
    for (let y = 0; y < h; y += 64) {
      for (let x = 0; x < w; x += 64) {
        const ox = x + ((y / 64) % 2) * 32 + 8;
        ctx.beginPath();
        ctx.ellipse(ox, y + 20, 3, 6, 0.5, 0, Math.PI * 2);
        ctx.ellipse(ox + 6, y + 26, 3, 6, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, { repeat: [1, 1] });
}

export function tileTex() {
  return canvasTex('tiles', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d8d2c4';
    ctx.fillRect(0, 0, w, h);
    const t = 32;
    for (let y = 0; y < h; y += t / 2) {
      for (let x = 0; x < w; x += t) {
        const off = ((y / (t / 2)) % 2) * (t / 2);
        ctx.fillStyle = '#f4f1ea';
        ctx.fillRect(x + off + 1, y + 1, t - 2, t / 2 - 2);
        ctx.fillRect(x + off - w + 1, y + 1, t - 2, t / 2 - 2);
      }
    }
  }, { repeat: [1, 1] });
}

export function rugTex(variant = 0) {
  const pal = [
    ['#a3473a', '#e6c79a', '#2f4a5f'],
    ['#38566e', '#e8d9b6', '#b8543a'],
  ][variant % 2];
  return canvasTex('rug' + variant, 256, 192, (ctx, w, h) => {
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = pal[1];
    ctx.lineWidth = 8;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, w - 56, h - 56);
    ctx.fillStyle = pal[2];
    for (let i = 0; i < 5; i++) {
      const cx = 50 + i * 39, cy = h / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 26);
      ctx.lineTo(cx + 15, cy);
      ctx.lineTo(cx, cy + 26);
      ctx.lineTo(cx - 15, cy);
      ctx.fill();
    }
    ctx.fillStyle = pal[1];
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(50 + i * 39, h / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function brickTex() {
  return canvasTex('brick', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8e5a48';
    ctx.fillRect(0, 0, w, h);
    const bh = 16, bw = 48;
    let s = 11;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < h; y += bh) {
      const off = ((y / bh) % 2) * (bw / 2);
      for (let x = -bw; x < w + bw; x += bw) {
        const l = 40 + r() * 10;
        ctx.fillStyle = `hsl(${12 + r() * 8}, 38%, ${l}%)`;
        ctx.fillRect(x + off + 1.5, y + 1.5, bw - 3, bh - 3);
      }
    }
  }, { repeat: [1, 1] });
}

// Calendar picture for the wall, one per scene.
export function calendarTex(key, month, color, motif) {
  return canvasTex('cal-' + key, 128, 160, (ctx, w, h) => {
    ctx.fillStyle = '#faf7f0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(8, 8, w - 16, 70);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    if (motif === 'lighthouse') {
      ctx.fillRect(58, 24, 12, 46);
      ctx.fillStyle = '#c33';
      ctx.fillRect(58, 34, 12, 8);
    } else if (motif === 'sun') {
      ctx.beginPath();
      ctx.arc(64, 44, 18, 0, Math.PI * 2);
      ctx.fill();
    } else if (motif === 'tree') {
      ctx.beginPath();
      ctx.arc(64, 38, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(61, 50, 6, 24);
    } else {
      ctx.beginPath();
      ctx.moveTo(20, 74);
      ctx.lineTo(54, 30);
      ctx.lineTo(80, 60);
      ctx.lineTo(96, 44);
      ctx.lineTo(112, 74);
      ctx.fill();
    }
    ctx.fillStyle = '#333';
    ctx.font = '700 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(month, w / 2, 96);
    ctx.fillStyle = '#bbb';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) ctx.fillRect(14 + c * 15, 106 + r * 10, 11, 6);
    ctx.fillStyle = '#d33';
    ctx.fillRect(14 + 4 * 15, 106 + 1 * 10, 11, 6);
  });
}

export const RepeatTex = THREE.RepeatWrapping;
