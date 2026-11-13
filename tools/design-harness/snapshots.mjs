import { stages } from './stage-definitions.mjs';
import { designInputs } from './contracts.mjs';
import { filesUnder, hashes, safeStat } from './io.mjs';
export function findStage(value) {
  const stage = stages.find((s, i) => s.id === value || String(i + 1) === value);
  if (!stage) throw new Error(`Unknown stage: ${value}`);
  return stage;
}
export function snapshot(base, stage, omit = []) {
  const end = stages.indexOf(findStage(stage));
  const paths = [...(safeStat(`${base}/control/figma.json`) ? ['control/figma.json'] : []), 'README.md', 'control/project.json', 'control/decisions.md',
    ...stages.slice(0, end + 1).flatMap(s => filesUnder(base, s.dir))];
  return hashes(base, paths.filter(path => !omit.includes(path)));
}
export function webInputs(base) {
  const files = filesUnder(base, '06-figma/web');
  const html = files.filter(path => path.endsWith('.html'));
  if (!html.length) throw new Error('No HTML screens in 06-figma/web/');
  // 승인 캡처가 바뀌면 시각 비교 결과도 다시 만들어야 하므로 입력에 포함한다.
  return { html, inputs: hashes(base, [...designInputs, 'control/project.json', ...files, ...filesUnder(base, '05-design-system/captures')]) };
}
export function handoffInputs(base) {
  return { ...snapshot(base, 'validation'), ...hashes(base, ['08-handoff/implementation-notes.md', '08-handoff/open-items.md', ...filesUnder(base, '08-handoff/assets')]) };
}
