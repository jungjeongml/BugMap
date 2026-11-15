// Serialized and executed inside Chromium: no Node imports or outer closures.
export function inspectWeb({ colors, fontSizes, forbidden, origin }) {
  const issues = [], canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const normalize = value => value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('en');
  function colorKey(value) {
    if (!CSS.supports('color', value)) return null;
    context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
    const pixels = [...context.getImageData(0, 0, 1, 1).data];
    return pixels[3] === 0 ? 'transparent' : pixels.join(',');
  }
  const allowed = new Set(Object.values(colors).map(colorKey));
  function selector(el) {
    if (el.id) return `${el.tagName.toLowerCase()}#${el.id}`;
    const parts = [];
    for (let n = el; n?.parentElement && parts.length < 5; n = n.parentElement) parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${[...n.parentElement.children].indexOf(n) + 1})`);
    return parts.join(' > ') || el.tagName.toLowerCase();
  }
  function issue(code, el, property, value) { issues.push({ code, selector: typeof el === 'string' ? el : selector(el), property, value }); }
  function visible(el) {
    if (!el.getClientRects().length || getComputedStyle(el).visibility !== 'visible') return false;
    for (let n = el; n instanceof Element; n = n.parentElement ?? n.getRootNode().host) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || Number(s.opacity) === 0) return false;
    }
    return true;
  }
  function checkColor(el, property, value) {
    const key = colorKey(value);
    if (key && key !== 'transparent' && !allowed.has(key)) issue('color', el, property, value);
  }
  function checkStyle(el, s, hasText, suffix = '') {
    const target = `${selector(el)}${suffix}`;
    if (hasText) {
      if (!(el instanceof SVGElement)) checkColor(target, 'color', s.color);
      const size = Number.parseFloat(s.fontSize);
      if (!fontSizes.some(value => Math.abs(value - size) < 0.01)) issue('font-size', target, 'font-size', s.fontSize);
    }
    checkColor(target, 'background-color', s.backgroundColor);
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (Number.parseFloat(s[`border${side}Width`]) > 0 && !['none', 'hidden'].includes(s[`border${side}Style`])) checkColor(target, `border-${side.toLowerCase()}-color`, s[`border${side}Color`]);
    }
    if (Number.parseFloat(s.outlineWidth) > 0 && s.outlineStyle !== 'none') checkColor(target, 'outline-color', s.outlineColor);
    for (const property of ['backgroundImage', 'boxShadow', 'textShadow']) {
      const value = s[property];
      if (value !== 'none') {
        const colorFunctions = value.match(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)/g) ?? [];
        for (const color of colorFunctions) checkColor(target, property, color);
        if (property === 'backgroundImage' && /gradient\(/i.test(value) && !colorFunctions.length) issue('unsupported-paint', target, property, value);
      }
    }
    if (el instanceof SVGElement) for (const property of ['fill', 'stroke']) if (s[property] && s[property] !== 'none') checkColor(target, property, s[property]);
  }
  function wording(value, target) {
    const haystack = normalize(value);
    for (const term of forbidden) if (haystack.includes(normalize(term))) issue('forbidden-copy', target, 'text', term);
  }
  const all = [];
  function collect(root) {
    for (const el of root.querySelectorAll('*')) {
      all.push(el);
      if (el.shadowRoot) { collect(el.shadowRoot); wording(el.shadowRoot.textContent ?? '', selector(el)); }
    }
  }
  collect(document);
  for (const el of all) {
    if (['SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD', 'TITLE'].includes(el.tagName) || !visible(el)) continue;
    if (el.tagName === 'IFRAME') issue('unsupported-frame', el, 'frame', el.getAttribute('src') ?? '');
    const s = getComputedStyle(el);
    const hasText = [...el.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()) || el.matches('input,textarea,select');
    checkStyle(el, s, hasText);
    if (el.matches('button,[role="button"],input[type="button"],input[type="submit"],input[type="reset"]')) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) issue('touch-target', el, 'size', `${rect.width}x${rect.height}`);
    }
    for (const property of ['aria-label', 'title', 'alt', 'placeholder', 'value']) {
      const value = property === 'value' && 'value' in el ? el.value : el.getAttribute(property);
      if (value) wording(value, selector(el));
    }
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo);
      if (ps.content && !['none', 'normal', '""', "''"].includes(ps.content) && ps.display !== 'none' && ps.visibility === 'visible') {
        checkStyle(el, ps, true, pseudo); wording(ps.content, `${selector(el)}${pseudo}`);
      }
    }
  }
  // 레이아웃 검사: 토큰 값만 맞으면 통과하던 잘림·겹침·화면 밖 이탈·낮은 대비를 계산된 텍스트 위치로 찾는다.
  const viewportWidth = document.documentElement.clientWidth, reported = new Set();
  function once(code, el, property, value) {
    const key = `${code}|${selector(el)}`;
    if (!reported.has(key)) { reported.add(key); issue(code, el, property, value); }
  }
  function rgba(value) { const key = colorKey(value); return key && key !== 'transparent' ? key.split(',').map(Number) : null; }
  function backdrop(el) {
    const layers = [];
    for (let n = el; n instanceof Element; n = n.parentElement) {
      const s = getComputedStyle(n);
      // 이미지·그라디언트 위 글자는 계산할 수 없으므로 승인 캡처 비교에 맡긴다.
      if (s.backgroundImage !== 'none') return null;
      const color = rgba(s.backgroundColor);
      if (color) { layers.push(color); if (color[3] === 255) break; }
    }
    return layers.reverse().reduce((under, c) => under.map((v, i) => c[i] * (c[3] / 255) + v * (1 - c[3] / 255)), [255, 255, 255]);
  }
  function luminance(rgb) {
    const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const texts = [], media = [];
  const walker = document.createTreeWalker(document.body ?? document.documentElement, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const owner = node.parentElement;
    if (!node.textContent.trim() || !owner || ['SCRIPT', 'STYLE'].includes(owner.tagName) || !visible(owner)) continue;
    const range = document.createRange(); range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0);
    if (rects.length) texts.push({ owner, rects });
  }
  for (const el of document.querySelectorAll('img,svg,video,canvas,input,textarea,select')) {
    if (el.tagName.toLowerCase() === 'svg' && el.parentElement?.closest('svg')) continue;
    const rect = el.getBoundingClientRect();
    if (visible(el) && rect.width > 0 && rect.height > 0) media.push({ owner: el, rects: [rect] });
  }
  for (const { owner, rects } of texts) {
    for (const r of rects) {
      if (r.left < -1 || r.right > viewportWidth + 1) once('offscreen', owner, 'x', `${Math.round(r.left)}..${Math.round(r.right)} / viewport ${viewportWidth}`);
      for (let n = owner; n && n !== document.documentElement && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n), clipX = ['hidden', 'clip'].includes(s.overflowX), clipY = ['hidden', 'clip'].includes(s.overflowY);
        if (!clipX && !clipY) continue;
        const box = n.getBoundingClientRect(), left = box.left + n.clientLeft, top = box.top + n.clientTop;
        if ((clipX && (r.left < left - 1 || r.right > left + n.clientWidth + 1)) || (clipY && (r.top < top - 1 || r.bottom > top + n.clientHeight + 1))) {
          once('text-clipped', owner, 'overflow', `${selector(n)}에서 잘림`);
          break;
        }
      }
    }
    const s = getComputedStyle(owner), fg = rgba(s.color), bg = backdrop(owner);
    if (fg && bg && !owner.closest(':disabled,[aria-disabled="true"]')) {
      const blended = bg.map((v, i) => fg[i] * (fg[3] / 255) + v * (1 - fg[3] / 255));
      const [hi, lo] = [luminance(blended), luminance(bg)].sort((a, b) => b - a);
      const ratio = (hi + 0.05) / (lo + 0.05), size = Number.parseFloat(s.fontSize);
      const minimum = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700) ? 3 : 4.5;
      if (ratio < minimum) once('contrast', owner, 'color', `${ratio.toFixed(2)}:1 (기준 ${minimum}:1)`);
    }
  }
  const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const boxes = [...texts, ...media];
  for (const text of texts) for (const other of boxes) {
    if (other.owner === text.owner || text.owner.contains(other.owner) || other.owner.contains(text.owner)) continue;
    if (text.rects.some(a => other.rects.some(b => overlaps(a, b)))) once('overlap', text.owner, 'layout', `${selector(other.owner)}와 겹침`);
  }
  wording(document.body?.innerText ?? '', 'body');
  for (const resource of performance.getEntriesByType('resource')) {
    if (resource.responseStatus >= 400) issue('resource-load', 'document', 'url', resource.name);
    const url = new URL(resource.name, location.href);
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== origin) issue('untracked-resource', 'document', 'url', resource.name);
  }
  return { issues, title: document.title, finalUrl: location.href };
}

// Chromium 안에서 실행: 실제 캡처와 승인 캡처(PNG data URL)를 픽셀 단위로 비교한다.
// 숨김·순서 변경·자산 교체처럼 계산된 스타일로는 드러나지 않는 변화를 잡는다.
export async function compareCaptures({ actual, expected, delta }) {
  const load = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image); image.onerror = () => reject(new Error('캡처 PNG를 읽지 못했습니다'));
    image.src = src;
  });
  const [a, b] = await Promise.all([load(actual), load(expected)]);
  if (a.naturalWidth !== b.naturalWidth || a.naturalHeight !== b.naturalHeight) {
    return { sizeMismatch: true, actual: `${a.naturalWidth}x${a.naturalHeight}`, expected: `${b.naturalWidth}x${b.naturalHeight}` };
  }
  const width = a.naturalWidth, height = a.naturalHeight;
  const pixels = image => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, width, height).data;
  };
  const p = pixels(a), q = pixels(b);
  let changed = 0, minX = width, minY = height, maxX = -1, maxY = -1;
  for (let i = 0; i < p.length; i += 4) {
    if (Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]), Math.abs(p[i + 3] - q[i + 3])) <= delta) continue;
    const k = i / 4, x = k % width, y = (k - x) / width;
    changed++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { width, height, changed, ratio: changed / (width * height),
    box: changed ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null };
}
