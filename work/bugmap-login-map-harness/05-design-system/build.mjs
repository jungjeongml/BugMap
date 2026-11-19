import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const file = path => new URL(path, import.meta.url);
const read = path => readFileSync(file(path));
const json = path => JSON.parse(read(path));
const { colors, typography, fontFamily, layout } = json('tokens.json');
const { strings } = json('copy.json');
const { width, height } = layout.viewport;
const escape = text => String(text).replace(/[&<>"']/g, char => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]
));
const svgContent = path => read(path).toString().match(/<svg\b[^>]*>([\s\S]*)<\/svg>/u)?.[1].trim();
const image = (path, x, y, width, height) =>
  `<image x="${x}" y="${y}" width="${width}" height="${height}" href="data:image/png;base64,${read(path).toString('base64')}"/>`;

function label(id, x, y, token, color, options = {}) {
  const t = typography[token];
  const length = options.length ? ` textLength="${options.length}" lengthAdjust="spacing"` : '';
  return `<text id="${id}" x="${x}" y="${y}" text-anchor="${options.anchor ?? 'start'}" font-size="${t.fontSize}" font-weight="${t.fontWeight}" fill="${colors[color]}"${length}>${escape(strings[id])}</text>`;
}

function observationPoint(x, y) {
  return `<circle cx="${x}" cy="${y}" r="9" fill="${colors.observationPointHalo}" stroke="${colors.observationHaloEdge}"/>
    <circle cx="${x}" cy="${y}" r="3" fill="${colors.primary}"/>`;
}

function provider(kind, index) {
  const { x, y, width, gap } = layout.providerStack;
  const { height, radius } = layout.providerButton;
  const visualRadius = Math.min(radius, height / 2);
  const color = colors[kind + 'Surface'];
  const border = colors[kind + 'Border'];
  const top = y + index * (height + gap);
  const surface = `<rect class="provider-surface" x="0" y="0" width="${width}" height="${height}" rx="${visualRadius}" data-corner-radius="${radius}" fill="${color}"/>`;
  const edge = border ? `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="${visualRadius - .5}" fill="none" stroke="${border}"/>` : '';
  let art;
  if (kind === 'kakao') {
    const scale = height / 46;
    const paths = svgContent('assets/kakao-login.svg').match(/<path\b[^>]*\/>/gu);
    if (paths.length !== 2) throw new Error('Expected two official Kakao paths.');
    art = `<g transform="translate(${(width - 224 * scale) / 2} 0) scale(${scale})">${paths.join('')}</g>`;
  } else if (kind === 'naver') {
    art = image('assets/naver-content.png', 109, 10, 140, 28);
  } else {
    art = image('assets/apple-login.png', 0, 0, width, height);
  }
  if (kind !== 'kakao') {
    const clip = `provider-${kind}-clip`;
    art = `<clipPath id="${clip}"><rect width="${width}" height="${height}" rx="${visualRadius}"/></clipPath>
    <g clip-path="url(#${clip})">${art}</g>`;
  }
  return `<g id="provider-${kind}" class="provider" aria-label="${escape(strings[kind])}" transform="translate(${x} ${top})">
    ${surface}
    ${art}
    ${edge}
  </g>`;
}

const logo = layout.logo;
const logoPath = svgContent('assets/bugmap-logo-vector-lime.svg');
const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="screen-title" xml:lang="ko">
  <title id="screen-title">05 · 첫 로그인 / 지도 배경</title>
  <style>text { font-family: ${fontFamily.preview}; }</style>
  <rect width="${width}" height="${height}" fill="${colors.canvas}"/>
  <g id="map-background" aria-hidden="true">${image('assets/map-background.png', 0, 0, width, height)}</g>
  <g id="system-time" aria-hidden="true">
    ${label('time', 26, 34, 'status', 'text', {length: 31})}
  </g>
  <g id="system-connection" aria-hidden="true" fill="${colors.text}">
    <rect x="298" y="29" width="3" height="4" rx="1"/>
    <rect x="303" y="27" width="3" height="6" rx="1"/>
    <rect x="308" y="24" width="3" height="9" rx="1"/>
    <rect x="312" y="21" width="3" height="12" rx="1"/>
    <path d="M319.5 25a10.4 10.4 0 0 1 14 0 M322.1 27.7a6.6 6.6 0 0 1 8.8 0 M324.6 30.2a2.8 2.8 0 0 1 3.8 0" fill="none" stroke="${colors.text}" stroke-width="1.4" stroke-linecap="round"/>
    <rect x="340.5" y="21.5" width="22" height="11" rx="2.5" fill="none" stroke="${colors.text}" stroke-opacity=".6"/>
    <rect x="342" y="23" width="19" height="8" rx="1.2"/>
    <rect x="364" y="25" width="1.6" height="4" rx=".8" opacity=".6"/>
  </g>
  <svg id="brand-logo" x="${logo.x}" y="${logo.y}" width="${logo.width}" height="${logo.height}" viewBox="127 478 1000 310" fill="${colors.primary}" aria-label="BugMap">
    ${logoPath}
  </svg>
  <g id="intro">
    ${label('title', 195, 188, 'title', 'text', {length: 235, anchor: 'middle'})}
    ${label('titleAccent', 195, 231, 'title', 'primary', {length: 196, anchor: 'middle'})}
    ${label('description', 195, 272, 'description', 'description', {length: 256, anchor: 'middle'})}
  </g>
  <g id="observations">
    <path id="observation-boundary" transform="translate(72 304)" d="M .8 45 C 4 36 16 33 26 30 L 44 7 C 51 -3 64 0 71 2 C 82 4 87 9 91 17 C 100 22 105 27 118 31 C 129 37 127 43 138 53 L 149 66 C 156 76 163 91 170 105 C 178 120 166 134 161 145 C 154 157 151 157 138 160 L 116 166 C 108 169 103 173 94 169 C 82 164 72 159 63 151 L 55 139 C 41 129 33 120 33 106 L 14 84 C 4 74 10 64 4 54 Z" fill="${colors.observationArea}" stroke="${colors.observationOutline}" stroke-width="1.5" stroke-linejoin="round"/>
    ${observationPoint(124, 385)}
    ${observationPoint(210, 434)}
    ${observationPoint(276, 452)}
    <circle cx="179" cy="394" r="31" fill="${colors.observationMarkerHalo}" stroke="${colors.observationHaloEdge}"/>
    <circle cx="179" cy="394" r="20" fill="${colors.primary}"/>
    <svg x="167" y="382" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.onPrimary}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 20v-9"/>
      <path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z"/>
      <path d="M14.12 3.88 16 2"/>
      <path d="M21 21a4 4 0 0 0-3.81-4"/>
      <path d="M21 5a4 4 0 0 1-3.55 3.97"/>
      <path d="M22 13h-4"/>
      <path d="M3 21a4 4 0 0 1 3.81-4"/>
      <path d="M3 5a4 4 0 0 0 3.55 3.97"/>
      <path d="M6 13H2"/>
      <path d="m8 2 1.88 1.88"/>
      <path d="M9 7.13V6a3 3 0 1 1 6 0v1.13"/>
    </svg>
    <path d="M199 394h12" stroke="${colors.observationOutline}" stroke-opacity=".38"/>
    <rect x="211.5" y="369.5" width="130" height="47" rx="11" fill="${colors.observationCard}" stroke="${colors.observationCardEdge}"/>
    ${label('observationTitle', 224, 387, 'observationTitle', 'text', {length: 67})}
    ${label('observationMeta', 224, 404, 'observationMeta', 'observationMeta', {length: 71})}
    ${label('park', 84, 348, 'mapLabel', 'parkLabel', {length: 31})}
    ${label('district', 284, 339, 'mapLabel', 'districtLabel', {length: 31})}
    ${label('river', 64, 481, 'mapLabel', 'riverLabel', {length: 21})}
  </g>
  <g id="sign-in-options">
    ${layout.providerStack.providerOrder.map(provider).join('\n    ')}
  </g>
  ${label('policy', 195, 763, 'policy', 'policy', {length: 252, anchor: 'middle'})}
  <rect id="home-indicator" aria-hidden="true" x="128" y="827" width="134" height="4" rx="2" fill="${colors.text}" opacity=".84"/>
</svg>
`;

writeFileSync(file('preview.svg'), svg);
const assetPaths = ['assets/map-background.png', 'assets/naver-content.png', 'assets/apple-login.png'];
const files = assetPaths.map(path => {
  const data = read(path);
  if (data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Expected PNG: ${path}`);
  return {
    path,
    bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
    dimensions: {width: data.readUInt32BE(16), height: data.readUInt32BE(20)}
  };
});
writeFileSync(file('assets-manifest.json'), JSON.stringify({sourceGuide: 'asset-sources.md', files}, null, 2) + '\n');
