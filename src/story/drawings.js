// Children's drawings and photographs for the fridge door close-ups.
// Crayon-ish SVG: thick round strokes, wobbled by a displacement filter.

const wrap = (body, bg = '#fffdf6', id = 'w') => `
<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" role="img">
  <defs>
    <filter id="crayon-${id}" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2"/>
    </filter>
  </defs>
  <rect width="200" height="150" fill="${bg}"/>
  <g filter="url(#crayon-${id})" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.2">${body}</g>
</svg>`;

const stick = (x, y, h, col, extra = '') => `
  <circle cx="${x}" cy="${y - h}" r="${h * 0.16}" stroke="#333" fill="#f6d7bd"/>
  <path d="M${x} ${y - h * 0.84} L${x} ${y - h * 0.35} M${x} ${y - h * 0.7} L${x - h * 0.22} ${y - h * 0.45} M${x} ${y - h * 0.7} L${x + h * 0.22} ${y - h * 0.45} M${x} ${y - h * 0.35} L${x - h * 0.14} ${y} M${x} ${y - h * 0.35} L${x + h * 0.14} ${y}" stroke="${col}"/>
  ${extra}`;

const label = (x, y, t, col = '#333', size = 11) => `<text x="${x}" y="${y}" font-family="Caveat, 'Comic Sans MS', cursive" font-size="${size}" fill="${col}" stroke="none" text-anchor="middle">${t}</text>`;

export const DRAWINGS = {
  family: () => wrap(`
    <circle cx="178" cy="22" r="12" stroke="#f2b822" fill="#f7d54a"/>
    <path d="M178 4 L178 0 M196 22 L200 22 M191 9 L195 5 M165 9 L161 5" stroke="#f2b822"/>
    <path d="M0 132 Q50 126 100 132 T200 130" stroke="#3aa65a"/>
    ${stick(40, 128, 70, '#2f8f9a', '<path d="M30 60 Q24 80 28 92 M50 60 Q56 80 52 92" stroke="#5a3418"/>')}
    ${stick(78, 128, 44, '#f2b822', '<circle cx="70" cy="86" r="4" stroke="#2a1a12"/><circle cx="86" cy="86" r="4" stroke="#2a1a12"/>')}
    ${stick(118, 128, 72, '#8a6a3a', '<circle cx="114" cy="56" r="3.5" stroke="#333"/><circle cx="122" cy="56" r="3.5" stroke="#333"/>')}
    <ellipse cx="164" cy="118" rx="18" ry="9" stroke="#3b2f2a" fill="#6a4a3a"/>
    <circle cx="183" cy="110" r="7" stroke="#3b2f2a" fill="#6a4a3a"/>
    <path d="M146 116 Q138 108 142 102 M156 126 L154 134 M174 126 L176 134" stroke="#3b2f2a"/>
    ${label(40, 146, 'MUM')}${label(78, 146, 'ME')}${label(118, 146, 'GRANDAD')}${label(166, 146, 'BISCUT')}
    ${label(70, 20, 'MY FAMLY', '#e0483a', 18)}
  `, '#fffdf6', 'fam'),

  pip: () => wrap(`
    <ellipse cx="100" cy="100" rx="50" ry="14" stroke="#b8b0a4" fill="#e8e2d8"/>
    <path d="M50 100 L50 74 Q100 60 150 74 L150 100" stroke="#a89f92" fill="#e8e2d8"/>
    <ellipse cx="100" cy="72" rx="46" ry="10" stroke="#f2b822" stroke-width="5"/>
    <path d="M86 86 Q100 96 114 86" stroke="#333"/>
    <circle cx="86" cy="80" r="2" fill="#333" stroke="#333"/><circle cx="114" cy="80" r="2" fill="#333" stroke="#333"/>
    <path d="M100 52 L100 36 M70 56 L60 42 M130 56 L140 42 M50 66 L34 60 M150 66 L166 60" stroke="#f2b822"/>
    ${label(100, 140, 'PIP!!', '#2f6fd0', 22)}
  `, '#fffdf6', 'pip'),

  solar: () => wrap(`
    <circle cx="160" cy="30" r="18" stroke="#f2b822" fill="#f7d54a"/>
    ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => `<path d="M${14 + c * 36 + r * 6} ${78 + r * 16} l28 0 l-6 12 l-28 0 z" stroke="#2f4f8f" fill="#4f7fcf"/>`).join('')).join('')}
    ${stick(104, 104, 26, '#e0d020', '<path d="M98 86 L110 86" stroke="#e0d020" stroke-width="6"/>')}
    ${label(100, 20, 'MUM AT WORK', '#333', 16)}
    ${label(126, 74, '← mum', '#e0483a', 11)}
  `, '#eef6ff', 'sol'),

  rocket: () => wrap(`
    <rect width="200" height="150" fill="#1d2a4a" stroke="none"/>
    ${[[20, 20], [40, 60], [170, 30], [150, 80], [70, 25], [120, 15], [185, 110], [30, 110]].map(([x, y]) => `<path d="M${x - 3} ${y} L${x + 3} ${y} M${x} ${y - 3} L${x} ${y + 3}" stroke="#fff6c0" stroke-width="2"/>`).join('')}
    <path d="M100 30 Q110 40 110 70 L90 70 Q90 40 100 30 Z" stroke="#ddd" fill="#f4f4f4"/>
    <path d="M90 62 L82 74 L90 72 M110 62 L118 74 L110 72" stroke="#e0483a"/>
    <path d="M94 74 Q100 110 98 140 M106 74 Q102 110 104 140" stroke="#f2b822" stroke-width="5"/>
    <path d="M100 76 Q100 110 101 140" stroke="#f08a2a" stroke-width="4"/>
    ${label(160, 140, 'No. 154', '#fff6c0', 16)}
  `, '#1d2a4a', 'rkt'),

  grandad: () => wrap(`
    <path d="M20 110 L130 110 L130 90 L20 90 Z" stroke="#9aa3ab" fill="#e8ecef"/>
    <path d="M20 90 L20 70 M130 96 L130 80 M24 124 L24 110 M126 124 L126 110" stroke="#9aa3ab"/>
    <circle cx="38" cy="80" r="11" stroke="#333" fill="#f6d7bd"/>
    <path d="M30 76 Q38 66 46 76" stroke="#bbb"/>
    <path d="M50 92 Q90 80 128 92" stroke="#7d8fa8" stroke-width="5"/>
    <path d="M150 124 L150 64 Q166 50 182 64 L182 124 Z" stroke="#c8ccd0" fill="#fafafa"/>
    <circle cx="166" cy="50" r="13" stroke="#c8ccd0" fill="#fafafa"/>
    <path d="M158 50 L174 50" stroke="#4fb8e8" stroke-width="4"/>
    <path d="M100 40 C92 28 76 34 84 46 L100 60 L116 46 C124 34 108 28 100 40 Z" stroke="#e0483a" fill="#f4a9c0"/>
    ${label(60, 140, 'GRANDAD', '#333', 14)}${label(166, 140, 'BIG PIP', '#333', 14)}
  `, '#fffdf6', 'gra'),

  minds: () => wrap(`
    <rect width="200" height="150" fill="#f4f0ff" stroke="none"/>
    ${[[40, 30], [90, 20], [150, 34], [64, 66], [120, 60], [170, 80], [30, 92], [96, 96], [150, 112]].map(([x, y], i, a) => `<circle cx="${x}" cy="${y}" r="${8 + (i % 3) * 3}" stroke="#7a5ae0" fill="#e6dcff"/>`).join('')}
    <path d="M40 30 L90 20 L150 34 L120 60 L64 66 L40 30 M90 20 L120 60 L170 80 L150 112 L96 96 L64 66 L30 92 L96 96 M120 60 L96 96" stroke="#b89af0" stroke-width="2"/>
    ${stick(20, 146, 26, '#f2b822')}
    ${label(110, 144, 'they are NICE (I think)', '#7a5ae0', 12)}
  `, '#f4f0ff', 'mnd'),

  lights: () => wrap(`
    <rect width="200" height="150" fill="#14204a" stroke="none"/>
    <circle cx="40" cy="34" r="16" stroke="#f2efe2" fill="#f2efe2"/>
    <circle cx="44" cy="30" r="1.5" fill="#f2b822" stroke="#f2b822"/><circle cx="36" cy="40" r="1.5" fill="#f2b822" stroke="#f2b822"/><circle cx="46" cy="40" r="1.5" fill="#f2b822" stroke="#f2b822"/>
    ${Array.from({ length: 26 }, (_, i) => `<circle cx="${70 + i * 5}" cy="${30 + Math.sin(i * 0.4) * 10}" r="1.6" fill="#fff6c0" stroke="#fff6c0"/>`).join('')}
    ${Array.from({ length: 30 }, (_, i) => `<circle cx="${10 + i * 6}" cy="${70 + Math.sin(i * 0.3 + 1) * 8}" r="1.6" fill="#fff6c0" stroke="#fff6c0"/>`).join('')}
    <path d="M60 150 L60 110 L80 94 L100 110 L100 150" stroke="#3a2a20" fill="#2a1f18"/>
    <rect x="72" y="118" width="12" height="10" fill="#ffd28a" stroke="#ffd28a"/>
    ${label(150, 140, 'the sky tonight', '#fff6c0', 13)}
  `, '#14204a', 'lgt'),

  robots: () => wrap(`
    <rect x="30" y="60" width="44" height="54" rx="6" stroke="#5a6a7a" fill="#cfd8e0"/>
    <rect x="38" y="36" width="28" height="22" rx="4" stroke="#5a6a7a" fill="#cfd8e0"/>
    <circle cx="46" cy="46" r="3" fill="#333" stroke="#333"/><circle cx="58" cy="46" r="3" fill="#333" stroke="#333"/>
    <path d="M52 70 C48 64 40 68 44 74 L52 82 L60 74 C64 68 56 64 52 70 Z" stroke="#e0483a" fill="#f4a9c0"/>
    <rect x="44" y="90" width="16" height="16" stroke="#8a6a3a" fill="#e6c79a"/>
    <path d="M40 114 L40 130 M64 114 L64 130 M30 72 L18 90 M74 72 L86 90" stroke="#5a6a7a"/>
    <g stroke="#f2b822" stroke-width="2.2">
      <path d="M110 140 L120 40 L170 30 L184 140 Z"/>
      <path d="M120 40 L184 140 M170 30 L110 140 M145 35 L147 140 M114 90 L180 90"/>
      <circle cx="146" cy="22" r="14"/>
      <path d="M140 20 L152 20"/>
    </g>
    ${label(100, 16, '(untitled)', '#999', 12)}
  `, '#fffdf6', 'rob'),
};

// Photographs: little painted scenes with a white border.
const photo = (inner, id) => `
<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="160" height="160" fill="#f7f5ef"/>
  <svg x="10" y="10" width="140" height="120" viewBox="0 0 140 120">${inner}</svg>
</svg>`;

export const PHOTOS = {
  beach: () => photo(`
    <rect width="140" height="60" fill="#9cc8e8"/><rect y="60" width="140" height="22" fill="#4f8fb8"/><rect y="82" width="140" height="38" fill="#e8d4a0"/>
    <circle cx="112" cy="22" r="10" fill="#fff4c0"/>
    <rect x="40" y="70" width="8" height="26" fill="#2f8f9a"/><circle cx="44" cy="66" r="5" fill="#d9a27e"/>
    <rect x="56" y="80" width="7" height="16" fill="#f2c230"/><circle cx="59.5" cy="76" r="4" fill="#c98f6a"/>
    <rect x="70" y="70" width="8" height="26" fill="#8a7550"/><circle cx="74" cy="66" r="5" fill="#e3b49a"/>
    <ellipse cx="94" cy="94" rx="9" ry="5" fill="#4a3a2a"/>`),
  dog: () => photo(`
    <rect width="140" height="120" fill="#7fae5a"/>
    <ellipse cx="70" cy="70" rx="40" ry="36" fill="#3b2f2a"/>
    <path d="M40 46 L32 18 L56 38 Z M100 46 L108 18 L84 38 Z" fill="#3b2f2a"/>
    <path d="M70 46 L58 104 L82 104 Z" fill="#efe9e1"/>
    <ellipse cx="70" cy="92" rx="16" ry="12" fill="#efe9e1"/>
    <circle cx="56" cy="62" r="4" fill="#111"/><circle cx="84" cy="62" r="4" fill="#111"/>
    <ellipse cx="70" cy="84" rx="6" ry="4" fill="#111"/>
    <path d="M70 92 Q70 100 76 102" stroke="#d66" stroke-width="3" fill="none"/>`),
  priya: () => photo(`
    <rect width="140" height="120" fill="#e0a85a"/>
    <rect y="80" width="140" height="40" fill="#8a4a3a"/>
    <circle cx="70" cy="46" r="18" fill="#9a6a4a"/>
    <path d="M52 40 Q70 14 88 40 L90 70 L50 70 Z" fill="#1a1210"/>
    <circle cx="70" cy="48" r="15" fill="#a87650"/>
    <path d="M62 54 Q70 62 78 54" stroke="#fff" stroke-width="3" fill="none"/>
    <rect x="46" y="66" width="48" height="40" rx="10" fill="#d0406a"/>
    <ellipse cx="100" cy="80" rx="18" ry="5" fill="#f4f1ea"/>
    <path d="M90 78 L96 72 L102 78 Z M100 78 L106 72 L112 78 Z" fill="#e0b050"/>`),
  tomato: () => photo(`
    <rect width="140" height="120" fill="#cfe6d0"/>
    <path d="M0 0 L140 0 L140 30 L0 30 Z" fill="#e8f4f0"/>
    <path d="M10 0 L10 120 M50 0 L50 120 M90 0 L90 120 M130 0 L130 120" stroke="#fff" stroke-width="2"/>
    <rect x="44" y="60" width="26" height="50" rx="6" fill="#6f8a5a"/>
    <circle cx="57" cy="46" r="13" fill="#e3b49a"/>
    <path d="M45 42 Q57 30 69 42" fill="#f2f0ec"/>
    <circle cx="92" cy="72" r="20" fill="#d8352a"/>
    <path d="M86 52 L92 58 L98 52" stroke="#3a7a3a" stroke-width="4" fill="none"/>
    <path d="M70 70 L78 72" stroke="#e3b49a" stroke-width="6"/>`),
};

export function art(name) {
  if (DRAWINGS[name]) return DRAWINGS[name]();
  if (PHOTOS[name]) return PHOTOS[name]();
  return '';
}
