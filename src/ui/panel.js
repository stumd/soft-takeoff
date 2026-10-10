import { art } from '../story/drawings.js';
import { audio } from '../audio/audio.js';

// Turns story blocks into DOM for the side panel.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const inline = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

const MAGNETS = ['#d33', '#36c', '#2a2', '#fb2', '#c3c'];

function fridgeBoard(notes) {
  const board = el('div', 'fridge');
  board.setAttribute('role', 'group');
  board.setAttribute('aria-label', 'Things stuck to the fridge');
  notes.forEach((n, i) => {
    let note;
    if (n.k === 'drawing') {
      note = el('div', 'fnote drawing', art(n.art));
    } else if (n.k === 'photo') {
      note = el('div', 'fnote photo', art(n.art) + (n.caption ? `<div class="cap">${esc(n.caption)}</div>` : ''));
    } else if (n.k === 'letter') {
      note = el('div', 'fnote letter', `<b>${esc(n.head)}</b>${esc(n.text).replace(/\n/g, '<br>')}${n.scrawl ? `<span class="scrawl">${esc(n.scrawl)}</span>` : ''}`);
    } else if (n.k === 'clip') {
      note = el('div', 'fnote clip', `<b>${esc(n.head)}</b>${esc(n.text || '')}`);
    } else if (n.k === 'menu') {
      note = el('div', 'fnote menu', esc(n.text).replace(/\n/g, '<br>'));
    } else if (n.k === 'card') {
      note = el('div', 'fnote card', esc(n.text).replace(/\n/g, '<br>'));
      note.style.background = n.c || '#2f3a5a';
    } else {
      note = el('div', 'fnote ' + (n.c || 'y'), esc(n.text));
    }
    note.style.transform = `rotate(${((i * 37) % 11 - 5) * 0.55}deg)`;
    note.style.setProperty('--mag', MAGNETS[i % MAGNETS.length]);
    board.appendChild(note);
  });
  return board;
}

function radioWidget(clips) {
  const w = el('div', 'radio');
  const dial = el('div', 'radio-dial');
  const needle = el('div', 'radio-needle');
  dial.appendChild(needle);
  const text = el('div', 'radio-text');
  text.setAttribute('aria-live', 'polite');
  const controls = el('div', 'radio-controls');
  const prev = el('button', null, '◂ retune');
  const label = el('span', null, '');
  const next = el('button', null, 'retune ▸');
  controls.append(prev, label, next);
  w.append(dial, text, controls);
  let i = 0;
  const show = () => {
    needle.style.left = `${10 + (clips.length > 1 ? (i / (clips.length - 1)) * 80 : 40)}%`;
    text.innerHTML = inline(clips[i]);
    label.textContent = `Riverside · ${i + 1} of ${clips.length}`;
    text.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
  };
  prev.onclick = () => { i = (i - 1 + clips.length) % clips.length; audio.staticBurst(); show(); };
  next.onclick = () => { i = (i + 1) % clips.length; audio.staticBurst(); show(); };
  show();
  return w;
}

function letter(l) {
  const w = el('div', 'letter');
  w.appendChild(el('div', 'from', esc(l.from)));
  w.appendChild(el('div', 'date', esc(l.date)));
  for (const line of l.lines) w.appendChild(el('p', null, inline(line)));
  return w;
}

export function renderBlocks(blocks, scene) {
  const frag = document.createDocumentFragment();
  for (const b of blocks) {
    if (typeof b === 'string') frag.appendChild(el('p', null, inline(b)));
    else if (b.aside) frag.appendChild(el('p', 'aside', inline(b.aside)));
    else if (b.say) {
      const d = el('div', 'say' + (b.who === 'Pip' ? ' pip' : ''));
      d.appendChild(el('span', 'who', esc(b.who)));
      d.appendChild(el('span', 'line', '“' + inline(b.say) + '”'));
      frag.appendChild(d);
    } else if (b.reveal) frag.appendChild(el('p', 'reveal', inline(b.reveal)));
    else if (b.fridge) frag.appendChild(fridgeBoard(scene.fridge || []));
    else if (b.radio) frag.appendChild(radioWidget(b.radio));
    else if (b.letter) frag.appendChild(letter(b.letter));
  }
  return frag;
}

export { inline, esc };
