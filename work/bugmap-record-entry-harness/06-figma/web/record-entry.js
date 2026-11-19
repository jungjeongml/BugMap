'use strict';

const form = document.getElementById('form-scroll');
const indicator = document.querySelector('#scroll-indicator > rect');
const bodyStart = Number(indicator.getAttribute('y'));
const indicatorHeight = Number(indicator.getAttribute('height'));

function syncScroll() {
  form.dataset.scrollAtStart = String(form.scrollTop === 0);
  const viewport = form.getBoundingClientRect();
  const distance = form.scrollHeight - form.clientHeight;
  const travel = form.clientHeight - indicatorHeight;
  indicator.setAttribute('y', bodyStart + (distance ? travel * form.scrollTop / distance : 0));
  form.querySelectorAll('text').forEach(label => {
    const bounds = label.getBoundingClientRect();
    const editing = label.closest('[aria-hidden="true"][role="textbox"]');
    label.style.visibility = !editing && bounds.bottom > viewport.top && bounds.top < viewport.bottom ? 'visible' : 'hidden';
  });
}

function editText(target) {
  if (form.querySelector('.editor')) return;
  const hit = target.querySelector('.hit');
  const text = target.querySelector('text');
  const initialText = text.textContent;
  const memo = target.getAttribute('aria-multiline') === 'true';
  const editor = document.createElement(memo ? 'textarea' : 'input');
  const top = Number(hit.getAttribute('y')) - bodyStart;
  const left = Number(hit.getAttribute('x'));
  editor.className = 'editor';
  editor.setAttribute('aria-label', target.getAttribute('aria-label'));
  editor.required = target.getAttribute('aria-required') === 'true';
  if (!memo) editor.type = 'text';
  if (memo || text.dataset.copy === 'speciesPlaceholder') editor.placeholder = initialText;
  else editor.value = initialText;
  if (target.dataset.sampleValue) editor.value = target.dataset.sampleValue;
  Object.assign(editor.style, {
    top: top + 'px', left: left + 'px',
    width: hit.getAttribute('width') + 'px', height: hit.getAttribute('height') + 'px',
  });
  text.style.visibility = 'hidden';
  target.setAttribute('aria-hidden', 'true');
  form.append(editor);
  editor.focus();
  editor.addEventListener('blur', () => {
    target.dataset.sampleValue = editor.value;
    if (!memo) text.textContent = editor.value || initialText;
    editor.remove();
    target.removeAttribute('aria-hidden');
    syncScroll();
  }, { once: true });
  editor.addEventListener('keydown', event => {
    if (event.key === 'Escape') target.focus();
  });
}

document.querySelectorAll('[role="textbox"]').forEach(target => {
  target.addEventListener('click', () => editText(target));
  target.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    editText(target);
  });
});
form.addEventListener('scroll', syncScroll, { passive: true });
document.fonts.ready.then(syncScroll);
syncScroll();
