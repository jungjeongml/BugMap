const screen = document.querySelector('main');
const list = document.querySelector('#record-scroll');
const content = list.querySelector('svg');
const heading = document.querySelector('#cluster-panel-title');
const rows = [...content.querySelectorAll('[data-record-id]')];

if (rows.length === 7 && new URLSearchParams(location.search).get('records') === '4') {
  for (const row of rows.splice(4)) row.remove();
  const bounds = rows.at(-1).querySelector('.hit');
  const viewBox = content.viewBox.baseVal;
  const height = Number(bounds.getAttribute('y')) + Number(bounds.getAttribute('height')) - viewBox.y;
  content.setAttribute('height', height);
  content.setAttribute('viewBox', [viewBox.x, viewBox.y, viewBox.width, height].join(' '));
  heading.textContent = screen.dataset.panelTitleFormat.replace('{count}', rows.length);
  const selected = document.querySelector('[aria-pressed="true"]');
  selected.querySelector('text').textContent = screen.dataset.markerFormat.replace('{count}', rows.length);
  selected.setAttribute('aria-label', screen.dataset.fixtureMarkerAccessible);
  document.title = heading.textContent;
}

const labels = [...list.querySelectorAll('[data-record-id] text')];
function updateLabels() {
  const viewport = list.getBoundingClientRect();
  for (const label of labels) {
    const box = label.getBoundingClientRect();
    label.style.visibility = box.top >= viewport.top && box.bottom <= viewport.bottom ? 'visible' : 'hidden';
  }
}
list.addEventListener('scroll', updateLabels, { passive: true });
document.fonts.ready.then(updateLabels);
updateLabels();

function openRecord(event) {
  const row = event.target.closest('[data-record-id]');
  if (!row) return;
  if (event.type === 'keydown') {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault();
  }
  const recordId = row.dataset.recordId;
  screen.dataset.lastRecordId = recordId;
  screen.dispatchEvent(new CustomEvent('bugmap:record', { detail: { recordId }, bubbles: true }));
}
list.addEventListener('click', openRecord);
list.addEventListener('keydown', openRecord);
