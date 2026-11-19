import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const WIDTH = 390;
const HEIGHT = 844;
const BODY_Y = 108;
const BODY_LIMIT = 728;
const BODY_VIEWPORT_HEIGHT = BODY_LIMIT - BODY_Y;
const FOOTER_Y = 734;
const BOTTOM_SAFE = 34;
const TITLE = '발견·채집 기록';

const block = (id, type, x, y, width, height, text, semantics = {}) => ({
  id, type, x, y, width, height, ...(text === undefined ? {} : { text }), ...semantics,
});

function frameShell(ready) {
  const header = [
    block('status-time', 'text', 16, 12, 70, 28, '9:41'),
    block('back', 'button', 16, 54, 56, 48, '뒤로', { action: 'back' }),
    block('screen-title', 'text', 116, 66, 180, 26, TITLE),
  ];
  const footer = [
    block('footer-background', 'box', 0, FOOTER_Y, WIDTH, HEIGHT - FOOTER_Y),
    ...(ready ? [] : [
      block('submit-guidance', 'text', 16, 734, 358, 24, '필수 항목을 입력하면 작성할 수 있어요'),
    ]),
    block('submit', ready ? 'button' : 'box', 16, 758, 358, 48, '작성완료', {
      action: 'submit', enabled: ready, fixed: true,
    }),
  ];
  return { header, footer };
}

function photoGroup(ready) {
  const addType = ready ? 'box' : 'button';
  return [
    block('photo-title', 'text', 16, 0, 200, 24, '사진 · 필수'),
    block('photo-count', 'text', 316, 0, 58, 24, ready ? '3/3장' : '0/3장'),
    block('camera', addType, 16, 32, 172, 48, '촬영하기', { action: 'camera', enabled: !ready }),
    block('gallery', addType, 202, 32, 172, 48, '사진 첨부', { action: 'gallery', enabled: !ready }),
    ...(ready ? [
      block('photo-guidance', 'text', 16, 88, 358, 24, '사진을 삭제하면 다시 추가할 수 있어요'),
      ...[16, 138, 260].flatMap((x, index) => [
        block('photo-' + (index + 1), 'image', x, 120, 114, 90, '사진 ' + (index + 1)),
        block('delete-photo-' + (index + 1), 'button', x + 70, 120, 44, 44, '삭제', {
          action: 'delete-photo', photo: index + 1, label: '사진 ' + (index + 1) + ' 삭제',
        }),
      ]),
    ] : [
      block('photo-guidance', 'text', 16, 88, 358, 24, '사진을 1장 이상 추가해 주세요'),
    ]),
  ];
}

function formGroups(ready) {
  const delta = ready ? 98 : 0;
  const item = (id, type, x, y, width, height, text, semantics) =>
    block(id, type, x, y + delta, width, height, text, semantics);
  return {
    photo: photoGroup(ready),
    species: [
      item('species-title', 'text', 16, 128, 200, 24, '곤충 이름'),
      item('species-name', 'input', 16, 156, 232, 48, ready ? '왕사슴벌레' : '곤충 이름 입력', { action: 'name' }),
      item('species-unknown', 'button', 264, 156, 110, 48, '이름 모름', {
        action: 'unknown-name', selected: false,
      }),
      item('type-title', 'text', 16, 216, 200, 24, '기록 유형'),
      item('type-observed', 'button', 16, 244, 172, 44, ready ? '● 관찰' : '관찰', {
        action: 'record-type', value: 'observed', selected: ready,
      }),
      item('type-collected', 'button', 202, 244, 172, 44, ready ? '○ 채집' : '채집', {
        action: 'record-type', value: 'collected', selected: false,
      }),
    ],
    location: [
      item('location-title', 'text', 16, 308, 240, 24, '발견 위치 · 필수'),
      item('location-picker', 'button', 16, 336, 358, 48,
        ready ? '서울숲 · 지도에서 변경' : '지도에서 발견 위치 선택', { action: 'pick-location' }),
      item('use-current-location', 'button', 16, 388, 172, 44, '현재 위치 사용', { action: 'use-current' }),
    ],
    observedAt: [
      item('observed-at-title', 'text', 16, 444, 200, 24, '발견 날짜·시간'),
      item('observed-date', 'button', 16, 472, 172, 48, ready ? '2026. 11. 20.' : '날짜 선택', {
        action: 'pick-date', label: '발견 날짜 선택',
      }),
      item('observed-time', 'button', 202, 472, 172, 48, ready ? '오전 09:30' : '시간 선택', {
        action: 'pick-time', label: '발견 시간 선택',
      }),
    ],
    memo: [
      item('memo-title', 'text', 16, 540, 240, 24, '메모 · 선택'),
      item('memo-input', 'input', 16, 568, 358, 112, '주변 환경이나 곤충 행동을 적어 주세요', {
        action: 'write-memo', multiline: true, required: false,
      }),
    ],
  };
}

function shift(blocks, delta) {
  return blocks.map((item) => ({ ...item, y: item.y + delta }));
}

function buildState(state) {
  const ready = state === 'ready';
  const { header, footer } = frameShell(ready);
  const groups = formGroups(ready);
  const body = Object.values(groups).flat();
  const title = TITLE + (ready ? ' · 3/3장' : ' · 0/3장');
  const bodyHeight = Math.max(...body.map((item) => item.y + item.height)) + 16;
  const visible = Object.values(groups)
    .filter((group) => group.every((item) => item.y + item.height <= BODY_VIEWPORT_HEIGHT))
    .flat();
  const [memoTitle, memoInput] = groups.memo;
  const memoVisibleHeight = BODY_VIEWPORT_HEIGHT - memoInput.y;
  if (memoVisibleHeight >= 44 && memoVisibleHeight < memoInput.height) {
    visible.push(memoTitle, block('memo-preview', 'box', memoInput.x, memoInput.y,
      memoInput.width, memoVisibleHeight, memoInput.text, { previewOf: memoInput.id }));
  }
  const scrollThumbHeight = Math.round(BODY_VIEWPORT_HEIGHT * BODY_VIEWPORT_HEIGHT / bodyHeight);
  const scrollThumb = block('scroll-indicator', 'box', 382, BODY_Y, 3, scrollThumbHeight);
  const viewport = {
    id: 'record-entry', state, title, width: WIDTH, height: HEIGHT,
    scroll: { x: 0, y: BODY_Y, width: WIDTH, height: BODY_VIEWPORT_HEIGHT, contentHeight: bodyHeight, groups },
    safeArea: { top: 54, bottom: BOTTOM_SAFE },
    blocks: [...header, ...shift(visible, BODY_Y), scrollThumb, ...footer],
  };
  const delta = BODY_Y + bodyHeight + 6 - FOOTER_Y;
  const fullForm = {
    id: 'record-entry', state, title: title + ' · 전체 폼', width: WIDTH, height: HEIGHT + delta,
    blocks: [...header, ...shift(body, BODY_Y), ...shift(footer, delta)],
  };
  return { viewport, fullForm };
}

const [wireframesDir, fullFormWireframesDir] = process.argv.slice(2);
if (!wireframesDir || !fullFormWireframesDir) {
  throw new Error('Usage: node layout.mjs <wireframes directory> <full-form wireframes directory>');
}
const states = ['default', 'ready'].map(buildState);
for (const [directory, key] of [[wireframesDir, 'viewport'], [fullFormWireframesDir, 'fullForm']]) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'wireframes.json'), JSON.stringify({ screens: states.map((item) => item[key]) }, null, 2) + '\n');
}
